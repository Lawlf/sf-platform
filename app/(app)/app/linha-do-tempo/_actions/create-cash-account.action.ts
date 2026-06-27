"use server";

import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

import type { CashAccountOption } from "./list-cash-accounts.action";

const inputSchema = z.object({
  label: z
    .string()
    .transform((label) => label.trim())
    .refine((label) => label.length > 0, "Dê um nome para a conta.")
    .refine((label) => label.length <= 120, "Nome muito longo."),
  isReserve: z.boolean().optional(),
});

export const createCashAccount = action({
  schema: inputSchema,
  handler: async ({ label, isReserve }, { userId, profileId }) => {
    const asset = unwrap(
      await createAsset(
        {
          assets: repos.assets,
          allocations: repos.assetDebtAllocations,
          debts: repos.debts,
          clock,
        },
        {
          userId,
          profileId,
          category: "cash",
          label,
          currentValueCents: 0n,
          currency: "BRL",
          metadata: { kind: "cash", yieldType: "none", ...(isReserve ? { isReserve: true } : {}) },
          fipeCode: null,
          acquiredAt: null,
          allocations: [],
        },
      ),
    );

    const account: CashAccountOption = {
      id: asset.id,
      label: asset.label,
      currency: asset.currentValue.currency,
      isReserve: isReserve === true,
      isBase: asset.label === "Carteira",
    };
    return { account };
  },
});
