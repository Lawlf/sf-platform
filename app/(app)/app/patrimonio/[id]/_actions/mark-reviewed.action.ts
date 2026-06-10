"use server";

import { z } from "zod";

import { markAssetReviewed } from "@/application/use-cases/asset/mark-asset-reviewed.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const markReviewedAction = action({
  schema: z.string().uuid(),
  revalidates: ["home", "assets"],
  handler: async (assetId, { userId }) => {
    unwrap(await markAssetReviewed({ assets: repos.assets, clock }, { userId, assetId }));
  },
  revalidatePaths: (_data, assetId) => [`/app/patrimonio/${assetId}`],
});
