"use server";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import type { CashAccountOption } from "./list-cash-accounts.action";

export type CreateCashAccountResult =
  | { ok: true; account: CashAccountOption }
  | { ok: false; message: string };

export async function createCashAccount(label: string): Promise<CreateCashAccountResult> {
  const user = await requireUser();
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "Dê um nome para a conta." };
  }
  if (trimmed.length > 120) {
    return { ok: false, message: "Nome muito longo." };
  }

  const result = await createAsset(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: new DrizzleDebtRepository(),
      clock: new SystemClock(),
    },
    {
      userId: user.id,
      category: "cash",
      label: trimmed,
      currentValueCents: 0n,
      currency: "BRL",
      metadata: { kind: "cash", yieldType: "none" },
      fipeCode: null,
      acquiredAt: null,
      allocations: [],
    },
  );

  if (!isOk(result)) {
    return { ok: false, message: "Não foi possível criar a conta." };
  }
  return {
    ok: true,
    account: {
      id: result.value.id,
      label: result.value.label,
      currency: result.value.currentValue.currency,
    },
  };
}
