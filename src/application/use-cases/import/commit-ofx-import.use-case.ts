import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { bankNameFromId } from "@/domain/services/ofx/bank-names";
import { detectPatterns } from "@/domain/services/ofx/detect-patterns";
import { findInternalTransfers } from "@/domain/services/ofx/internal-transfers";
import { mergeOfxStatements } from "@/domain/services/ofx/merge-ofx-statements";
import type { OfxParseError } from "@/domain/services/ofx/ofx-types";
import { parseOfx } from "@/domain/services/ofx/parse-ofx";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CommitOfxImportDeps {
  assets: Pick<AssetRepositoryPort, "findByExternalAccountKey" | "create" | "update" | "listExternalAccountKeys">;
  transactions: Pick<TransactionRepositoryPort, "existingExternalIds" | "create">;
  incomes: Pick<IncomeRepositoryPort, "create">;
  debts: Pick<DebtRepositoryPort, "create">;
  clock: Clock;
}

export interface CommitOfxImportInput {
  userId: string;
  contents: string[];
  acceptedIncomeFitIds: string[];
  acceptedDebtFitIds: string[];
  isPro: boolean;
  reserveTotalCents?: bigint | null;
}

export interface CommitOfxImportResult {
  assetId: string;
  ledgerBalanceCents: bigint;
  importedTransactions: number;
  createdIncomes: number;
  createdDebts: number;
  reserveValueCents: bigint | null;
}

export type CommitOfxImportError = OfxParseError | { kind: "account_limit" };

export async function commitOfxImport(
  deps: CommitOfxImportDeps,
  input: CommitOfxImportInput,
): Promise<Result<CommitOfxImportResult, CommitOfxImportError>> {
  const statements = [];
  for (const c of input.contents) {
    const p = parseOfx(c);
    if (p._tag === "err") return err(p.error);
    statements.push(p.value);
  }
  const mergedR = mergeOfxStatements(statements);
  if (mergedR._tag === "err") return err(mergedR.error);
  const st = mergedR.value;

  if (!input.isPro) {
    const connectedKeys = (await deps.assets.listExternalAccountKeys(input.userId)).filter(
      (k) => !k.endsWith(":reserve"),
    );
    const alreadyConnected = connectedKeys.includes(st.accountKey);
    if (!alreadyConnected && connectedKeys.length >= 1) {
      return err({ kind: "account_limit" });
    }
  }

  const now = deps.clock.now();

  const bankId = st.accountKey.split(":")[0] ?? st.accountKey;
  const bankName = bankNameFromId(bankId);
  const existing = await deps.assets.findByExternalAccountKey(input.userId, st.accountKey);
  let assetId: string;

  if (existing) {
    const updated: AssetEntity = {
      ...existing,
      currentValue: Money.fromCents(st.ledgerBalanceCents),
      updatedAt: now,
    };
    await deps.assets.update(updated);
    assetId = existing.id;
  } else {
    const newId = crypto.randomUUID();
    const asset: AssetEntity = {
      id: newId,
      userId: input.userId,
      category: "cash",
      label: bankName ?? `Conta ${bankId}`,
      currentValue: Money.fromCents(st.ledgerBalanceCents),
      metadata: { kind: "cash" },
      fipeCode: null,
      fipeLastSyncedAt: null,
      acquiredAt: null,
      depreciationKind: "stable",
      depreciationRatePctYear: 0,
      purchaseDate: null,
      purchasePriceCents: null,
      createdAt: now,
      updatedAt: now,
      anchorAt: null,
      deactivatedAt: null,
      deactivationKind: null,
      salePriceCents: null,
      deactivationReason: null,
      deletedAt: null,
      externalAccountKey: st.accountKey,
    };
    await deps.assets.create(asset);
    // Sob corrida de double-commit o create pode ter virado no-op (índice único
    // por external_account_key); re-busca pela chave para anexar as transações à
    // conta vencedora em vez de a um id que não foi persistido.
    const persisted = await deps.assets.findByExternalAccountKey(input.userId, st.accountKey);
    assetId = persisted?.id ?? newId;
  }

  const allFitIds = st.transactions.map((t) => t.fitId).filter((id) => id.length > 0);
  const seen = new Set(await deps.transactions.existingExternalIds(input.userId, allFitIds));
  const newTxns = st.transactions.filter((t) => !seen.has(t.fitId));

  const movement = findInternalTransfers(newTxns);
  const incomeSet = new Set(input.acceptedIncomeFitIds);
  const debtSet = new Set(input.acceptedDebtFitIds);

  for (const t of newTxns) {
    const category = movement.internalFitIds.has(t.fitId)
      ? "internal_transfer"
      : debtSet.has(t.fitId)
        ? "promoted_debt"
        : incomeSet.has(t.fitId)
          ? "promoted_income"
          : null;
    await deps.transactions.create({
      id: crypto.randomUUID(),
      userId: input.userId,
      direction: t.direction,
      amount: Money.fromCents(t.amountCents),
      description: t.memo,
      category,
      accountId: assetId,
      occurredAt: t.postedAt,
      status: "paid",
      source: "ofx_import",
      externalId: t.fitId,
      deletedAt: null,
    });
  }

  const sugg = detectPatterns(newTxns, movement.internalFitIds);

  const incomeByFitId = new Map(
    sugg.incomes.flatMap((inc) => inc.fitIds.map((f) => [f, inc] as const)),
  );
  const debtByFitId = new Map(
    sugg.debts.flatMap((d) => d.fitIds.map((f) => [f, d] as const)),
  );

  let createdIncomes = 0;
  for (const t of newTxns) {
    if (!incomeSet.has(t.fitId)) continue;
    const sugg = incomeByFitId.get(t.fitId);
    const label = sugg?.label ?? t.memo;
    const amountCents = sugg?.amountCents ?? t.amountCents;
    const entity: IncomeEntity = {
      id: crypto.randomUUID(),
      userId: input.userId,
      label,
      amount: Money.fromCents(amountCents),
      frequency: "monthly",
      startDate: now,
      endDate: null,
      paymentDay: null,
      isEstimated: false,
      isActive: true,
      createdAt: now,
      deletedAt: null,
    };
    await deps.incomes.create(entity);
    createdIncomes += 1;
  }

  let createdDebts = 0;
  const zeroRate = InterestRate.fromAnnual(0);
  if (zeroRate._tag === "err") return err({ kind: "malformed", detail: "internal rate error" });
  const annualInterestRate = zeroRate.value;

  for (const t of newTxns) {
    if (!debtSet.has(t.fitId)) continue;
    const sugg = debtByFitId.get(t.fitId);
    const label = sugg?.label ?? t.memo;
    const installmentCents = sugg?.installmentCents ?? t.amountCents;
    const installmentMoney = Money.fromCents(installmentCents);
    const termMonths = sugg?.installmentsTotal ?? 1;
    const principalMoney = installmentMoney.multiply(termMonths);
    const paidCount = sugg?.installmentsPaid ?? 0;
    const remainingCount = Math.max(termMonths - paidCount, 0);
    const currentBalanceMoney = installmentMoney.multiply(remainingCount);
    const entity: DebtEntity = {
      id: crypto.randomUUID(),
      userId: input.userId,
      label,
      status: "active",
      kind: "personal_loan",
      originalPrincipal: principalMoney,
      currentBalance: currentBalanceMoney,
      annualInterestRate,
      termMonths,
      monthlyInstallment: installmentMoney,
      startDate: now,
      expectedEndDate: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      recurringFrequency: null,
      recurringAmountCents: null,
      expenseCategory: null,
    };
    await deps.debts.create(entity);
    createdDebts += 1;
  }

  let reserveValueCents: bigint | null = null;
  if (input.reserveTotalCents != null) {
    const reserveKey = `${st.accountKey}:reserve`;
    const existingReserve = await deps.assets.findByExternalAccountKey(input.userId, reserveKey);
    const reserveValue = Money.fromCents(input.reserveTotalCents);
    if (existingReserve) {
      await deps.assets.update({ ...existingReserve, currentValue: reserveValue, updatedAt: now });
    } else {
      await deps.assets.create({
        id: crypto.randomUUID(),
        userId: input.userId,
        category: "cash",
        label: `Reserva ${bankName ?? bankId}`,
        currentValue: reserveValue,
        metadata: { kind: "cash" },
        fipeCode: null,
        fipeLastSyncedAt: null,
        acquiredAt: null,
        depreciationKind: "stable",
        depreciationRatePctYear: 0,
        purchaseDate: null,
        purchasePriceCents: null,
        createdAt: now,
        updatedAt: now,
        anchorAt: null,
        deactivatedAt: null,
        deactivationKind: null,
        salePriceCents: null,
        deactivationReason: null,
        deletedAt: null,
        externalAccountKey: reserveKey,
      });
    }
    reserveValueCents = input.reserveTotalCents;
  }

  return ok({
    assetId,
    ledgerBalanceCents: st.ledgerBalanceCents,
    importedTransactions: newTxns.length,
    createdIncomes,
    createdDebts,
    reserveValueCents,
  });
}
