"use server";

import { getWalletBalance } from "@/application/use-cases/wallet/get-wallet-balance.use-case";
import { clock, repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export interface WalletBalancePayload {
  walletId: string;
  reactiveBalance: SerializedMoney;
  monthEndProjection: SerializedMoney;
  needsAnchor: boolean;
}

export async function fetchWalletBalance(): Promise<WalletBalancePayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await getWalletBalance(
    {
      assets: repos.assets,
      incomes: repos.incomes,
      debts: repos.debts,
      settlements: repos.recurringSettlements,
      incomeSettlements: repos.incomeSettlements,
      debtPayments: repos.debtPayments,
      transactions: repos.transactions,
      debtAmountAdjustments: repos.debtAmountAdjustments,
      clock,
    },
    { userId: user.id },
  );
  if (!isOk(result)) return null;

  const v = result.value;
  return {
    walletId: v.walletId,
    reactiveBalance: serializeMoney(v.reactiveBalance),
    monthEndProjection: serializeMoney(v.monthEndProjection),
    needsAnchor: v.needsAnchor,
  };
}
