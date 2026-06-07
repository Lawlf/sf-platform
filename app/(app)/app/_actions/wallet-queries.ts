"use server";

import { getWalletBalance } from "@/application/use-cases/wallet/get-wallet-balance.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleRecurringSettlementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-recurring-settlement.repository";
import { DrizzleTransactionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-transaction.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export interface WalletBalancePayload {
  walletId: string;
  reactiveBalance: SerializedMoney;
  monthEndProjection: SerializedMoney;
}

export async function fetchWalletBalance(): Promise<WalletBalancePayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await getWalletBalance(
    {
      assets: new DrizzleAssetRepository(),
      incomes: new DrizzleIncomeRepository(),
      debts: new DrizzleDebtRepository(),
      settlements: new DrizzleRecurringSettlementRepository(),
      transactions: new DrizzleTransactionRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id },
  );
  if (!isOk(result)) return null;

  const v = result.value;
  return {
    walletId: v.walletId,
    reactiveBalance: serializeMoney(v.reactiveBalance),
    monthEndProjection: serializeMoney(v.monthEndProjection),
  };
}
