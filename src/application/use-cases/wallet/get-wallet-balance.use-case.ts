import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtAmountAdjustmentEntity } from "@/domain/entities/debt-amount-adjustment.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { buildDefaultWallet } from "@/domain/services/default-wallet.factory";
import { WalletBalanceService } from "@/domain/services/wallet-balance.service";
import { type EventWindow, WalletEventGenerator } from "@/domain/services/wallet-event-generator.service";
import type { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { DomainError } from "@/shared/errors/domain-error";
import { ok, type Result } from "@/shared/errors/result";

export interface GetWalletBalanceDeps {
  assets: {
    findActiveByUserAndCategory(userId: string, category: "cash"): Promise<AssetEntity[]>;
    createDefaultWallet(asset: AssetEntity): Promise<void>;
  };
  incomes: { listForUser(userId: string, opts?: { onlyActive?: boolean }): Promise<IncomeEntity[]> };
  debts: { listForUser(userId: string, opts?: { status?: "active" }): Promise<DebtEntity[]> };
  settlements: { listForUserMonth(userId: string, month: Date): Promise<RecurringSettlementEntity[]> };
  incomeSettlements: { listForUserMonth(userId: string, month: Date): Promise<IncomeSettlementEntity[]> };
  debtPayments: {
    listForUserInRange(userId: string, range: { from: Date; to: Date }): Promise<DebtPaymentEntity[]>;
  };
  transactions: { listForUserInRange(userId: string, from: Date, to: Date): Promise<TransactionEntity[]> };
  debtAmountAdjustments: { listForUser(userId: string): Promise<DebtAmountAdjustmentEntity[]> };
  clock: { now(): Date };
}

export interface GetWalletBalanceInput {
  userId: string;
}

export interface WalletBalanceResult {
  walletId: string;
  reactiveBalance: Money;
  monthEndProjection: Money;
  needsAnchor: boolean;
}

export class NoWalletError extends DomainError {
  readonly code = "NO_WALLET" as const;

  constructor() {
    super("Usuário não tem Carteira.");
  }
}

function endOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function monthsInWindow(window: EventWindow): Date[] {
  const out: Date[] = [];
  let y = window.from.getUTCFullYear();
  let m = window.from.getUTCMonth();
  const endY = window.to.getUTCFullYear();
  const endM = window.to.getUTCMonth();
  while (y < endY || (y === endY && m <= endM)) {
    out.push(new Date(Date.UTC(y, m, 1)));
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export async function getWalletBalance(
  deps: GetWalletBalanceDeps,
  input: GetWalletBalanceInput,
): Promise<Result<WalletBalanceResult, NoWalletError>> {
  const cash = await deps.assets.findActiveByUserAndCategory(input.userId, "cash");
  // A Carteira é um ativo DEDICADO (label "Carteira"). Nunca caímos no primeiro
  // cash qualquer (ex.: Reserva), senão editar a Reserva mexeria no saldo da
  // Carteira. Se não existe, cria a Carteira vazia (idempotente) e usa ela.
  let walletAsset = cash.find((a) => a.label === "Carteira");
  if (!walletAsset) {
    const fresh = buildDefaultWallet(input.userId, crypto.randomUUID(), deps.clock.now());
    await deps.assets.createDefaultWallet(fresh);
    const after = await deps.assets.findActiveByUserAndCategory(input.userId, "cash");
    walletAsset = after.find((a) => a.label === "Carteira") ?? fresh;
  }

  const asOf = deps.clock.now();
  const anchorAt = walletAsset.anchorAt ?? walletAsset.createdAt;
  const window: EventWindow = { from: anchorAt, to: endOfMonthUtc(asOf) };

  const [incomes, debts, transactions, payments, adjustments] = await Promise.all([
    deps.incomes.listForUser(input.userId, { onlyActive: true }),
    deps.debts.listForUser(input.userId, { status: "active" }),
    deps.transactions.listForUserInRange(input.userId, anchorAt, endOfMonthUtc(asOf)),
    deps.debtPayments.listForUserInRange(input.userId, { from: anchorAt, to: endOfMonthUtc(asOf) }),
    deps.debtAmountAdjustments.listForUser(input.userId),
  ]);

  const months = monthsInWindow(window);
  const [settlementLists, incomeSettlementLists] = await Promise.all([
    Promise.all(months.map((month) => deps.settlements.listForUserMonth(input.userId, month))),
    Promise.all(months.map((month) => deps.incomeSettlements.listForUserMonth(input.userId, month))),
  ]);
  const settlements = settlementLists.flat();
  const incomeSettlements = incomeSettlementLists.flat();

  const events = WalletEventGenerator.generate({
    incomes,
    debts,
    settlements,
    incomeSettlements,
    payments,
    transactions,
    walletId: walletAsset.id,
    window,
    adjustments,
    currentMonth: MonthYear.fromDate(asOf),
  });

  const base = { anchorValue: walletAsset.currentValue, anchorAt, asOf, events };
  return ok({
    walletId: walletAsset.id,
    reactiveBalance: WalletBalanceService.reactiveBalance(base),
    monthEndProjection: WalletBalanceService.monthEndProjection({ ...base, expectedEvents: events }),
    needsAnchor: walletAsset.anchorAt === null,
  });
}
