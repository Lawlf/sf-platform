import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { WalletBalanceService } from "@/domain/services/wallet-balance.service";
import { type EventWindow, WalletEventGenerator } from "@/domain/services/wallet-event-generator.service";
import type { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface GetWalletBalanceDeps {
  assets: { findActiveByUserAndCategory(userId: string, category: "cash"): Promise<AssetEntity[]> };
  incomes: { listForUser(userId: string, opts?: { onlyActive?: boolean }): Promise<IncomeEntity[]> };
  debts: { listForUser(userId: string, opts?: { status?: "active" }): Promise<DebtEntity[]> };
  settlements: { listForUserMonth(userId: string, month: Date): Promise<RecurringSettlementEntity[]> };
  transactions: { listForUserInRange(userId: string, from: Date, to: Date): Promise<TransactionEntity[]> };
  clock: { now(): Date };
}

export interface GetWalletBalanceInput {
  userId: string;
}

export interface WalletBalanceResult {
  walletId: string;
  reactiveBalance: Money;
  monthEndProjection: Money;
}

export class NoWalletError extends Error {
  constructor() {
    super("Usuário não tem Carteira.");
    this.name = "NoWalletError";
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
  const walletAsset = cash.find((a) => a.label === "Carteira") ?? cash[0];
  if (!walletAsset) return err(new NoWalletError());

  const asOf = deps.clock.now();
  const anchorAt = walletAsset.anchorAt ?? walletAsset.createdAt;
  const window: EventWindow = { from: anchorAt, to: endOfMonthUtc(asOf) };

  const [incomes, debts, transactions] = await Promise.all([
    deps.incomes.listForUser(input.userId, { onlyActive: true }),
    deps.debts.listForUser(input.userId, { status: "active" }),
    deps.transactions.listForUserInRange(input.userId, anchorAt, endOfMonthUtc(asOf)),
  ]);

  const settlementLists = await Promise.all(
    monthsInWindow(window).map((month) => deps.settlements.listForUserMonth(input.userId, month)),
  );
  const settlements = settlementLists.flat();

  const events = WalletEventGenerator.generate({
    incomes,
    debts,
    settlements,
    transactions,
    walletId: walletAsset.id,
    window,
  });

  const base = { anchorValue: walletAsset.currentValue, anchorAt, asOf, events };
  return ok({
    walletId: walletAsset.id,
    reactiveBalance: WalletBalanceService.reactiveBalance(base),
    monthEndProjection: WalletBalanceService.monthEndProjection({ ...base, expectedEvents: events }),
  });
}
