"use server";

import { z } from "zod";

import { deactivateAsset } from "@/application/use-cases/asset/deactivate-asset.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  kind: z.enum(["sold", "lost", "donated", "not_specified"]),
  salePriceCents: z
    .string()
    .regex(/^-?\d+$/, "Preço de venda inválido.")
    .nullable()
    .optional(),
  reason: z.string().max(500).nullable().optional(),
});

export const deactivateAssetAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts", "timeline", "home"],
  handler: async (input, { profileId }) => {
    const salePriceCents =
      input.salePriceCents !== undefined && input.salePriceCents !== null
        ? BigInt(input.salePriceCents)
        : null;

    unwrap(
      await deactivateAsset(
        { assets: repos.assets, clock },
        {
          profileId,
          assetId: input.assetId,
          kind: input.kind,
          salePriceCents,
          reason: input.reason ?? null,
        },
      ),
    );
  },
  revalidatePaths: (_data, input) => [`/app/patrimonio/${input.assetId}`],
});
