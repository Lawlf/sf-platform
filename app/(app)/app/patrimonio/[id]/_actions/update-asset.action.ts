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
});

export const updateAssetAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts", "timeline", "home"],
  handler: async (input, { userId }) => {
    const currentValueCents =
      input.currentValueCents !== undefined ? BigInt(input.currentValueCents) : undefined;

    unwrap(
      await updateAsset(
        { assets: repos.assets, clock },
        {
          userId,
          assetId: input.assetId,
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(currentValueCents !== undefined ? { currentValueCents } : {}),
        },
      ),
    );
  },
  revalidatePaths: (_data, input) => [`/app/patrimonio/${input.assetId}`],
});
