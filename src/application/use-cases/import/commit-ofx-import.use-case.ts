import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";
import { detectPatterns } from "@/domain/services/ofx/detect-patterns";
import type { OfxParseError } from "@/domain/services/ofx/ofx-types";
import { parseOfx } from "@/domain/services/ofx/parse-ofx";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CommitOfxImportDeps {
  assets: Pick<AssetRepository, "findByExternalAccountKey" | "create" | "update" | "listExternalAccountKeys">;
  transactions: Pick<TransactionRepository, "existingExternalIds" | "create">;
  incomes: Pick<IncomeRepository, "create">;
  debts: Pick<DebtRepository, "create">;
  clock: Clock;
}

export interface CommitOfxImportInput {
  userId: string;
  content: string;
  acceptedIncomeFitIds: string[];
  acceptedDebtFitIds: string[];
  isPro: boolean;
}

export interface CommitOfxImportResult {
  assetId: string;
  importedTransactions: number;
  createdIncomes: number;
  createdDebts: number;
}

export type CommitOfxImportError = OfxParseError | { kind: "account_limit" };

export async function commitOfxImport(
  deps: CommitOfxImportDeps,
  input: CommitOfxImportInput,
): Promise<Result<CommitOfxImportResult, CommitOfxImportError>> {
  const parsed = parseOfx(input.content);
  if (parsed._tag === "err") return err(parsed.error);
  const st = parsed.value;

  if (!input.isPro) {
    const connectedKeys = await deps.assets.listExternalAccountKeys(input.userId);
    const alreadyConnected = connectedKeys.includes(st.accountKey);
    if (!alreadyConnected && connectedKeys.length >= 1) {
      return err({ kind: "account_limit" });
    }
  }

  const now = deps.clock.now();

  const bankId = st.accountKey.split(":")[0] ?? st.accountKey;
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
      label: `Conta ${bankId}`,
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
    assetId = newId;
  }

  const allFitIds = st.transactions.map((t) => t.fitId).filter((id) => id.length > 0);
  const seen = new Set(await deps.transactions.existingExternalIds(input.userId, allFitIds));
  const newTxns = st.transactions.filter((t) => !seen.has(t.fitId));

  for (const t of newTxns) {
    await deps.transactions.create({
      id: crypto.randomUUID(),
      userId: input.userId,
      direction: t.direction,
      amount: Money.fromCents(t.amountCents),
      description: t.memo,
      category: null,
      accountId: assetId,
      occurredAt: t.postedAt,
      status: "paid",
      source: "ofx_import",
      externalId: t.fitId,
      deletedAt: null,
    });
  }

  const sugg = detectPatterns(newTxns);
  const incomeSet = new Set(input.acceptedIncomeFitIds);
  const debtSet = new Set(input.acceptedDebtFitIds);

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

  return ok({ assetId, importedTransactions: newTxns.length, createdIncomes, createdDebts });
}
