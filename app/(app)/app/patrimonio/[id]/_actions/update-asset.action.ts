"use server";

import { z } from "zod";

import { updateAsset } from "@/application/use-cases/asset/update-asset.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  label: z.string().min(1).max(120).optional(),
  currentValueCents: z
    .string()
    .regex(/^-?\d+$/, "Valor inválido.")
    .optional(),
  monthlyCostEstimateCents: z
    .string()
    .regex(/^\d+$/, "Valor inválido.")
    .nullable()
    .optional(),
});

export const updateAssetAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts", "timeline", "home"],
  handler: async (input, { profileId }) => {
    const currentValueCents =
      input.currentValueCents !== undefined ? BigInt(input.currentValueCents) : undefined;
    const monthlyCostEstimateCents =
      input.monthlyCostEstimateCents === undefined
        ? undefined
        : input.monthlyCostEstimateCents === null
          ? null
          : BigInt(input.monthlyCostEstimateCents);

    unwrap(
      await updateAsset(
        { assets: repos.assets, clock },
        {
          profileId,
          assetId: input.assetId,
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(currentValueCents !== undefined ? { currentValueCents } : {}),
          ...(monthlyCostEstimateCents !== undefined ? { monthlyCostEstimateCents } : {}),
        },
      ),
    );
  },
  revalidatePaths: (_data, input) => [`/app/patrimonio/${input.assetId}`],
});
