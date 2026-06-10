"use server";

import { z } from "zod";

import { refreshAssetFromFipe } from "@/application/use-cases/asset/refresh-asset-from-fipe.use-case";
import { clock, repos } from "@/infrastructure/container";
import { ParallelumFipeClient } from "@/infrastructure/external/fipe/parallelum-fipe.client";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  assetId: z.string().uuid(),
});

export const refreshFipeAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts", "timeline", "home"],
  handler: async (input, { userId }) => {
    unwrap(
      await refreshAssetFromFipe(
        {
          assets: repos.assets,
          fipe: new ParallelumFipeClient(),
          clock,
        },
        { userId, assetId: input.assetId },
      ),
    );
  },
  revalidatePaths: (_data, input) => [`/app/patrimonio/${input.assetId}`],
});
