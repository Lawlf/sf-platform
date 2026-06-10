"use server";

import { z } from "zod";

import { deleteAsset } from "@/application/use-cases/asset/delete-asset.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

import { detectNotificationsForUser } from "../../../_actions/_notifications";
import { purgeEntityBestEffort } from "../../../_actions/_purge-entity";

export const deleteAssetAction = action({
  schema: z.string(),
  revalidates: ["assets", "debts", "timeline", "notifications", "home"],
  handler: async (assetId, { userId }) => {
    unwrap(
      await deleteAsset(
        {
          assets: repos.assets,
          allocations: repos.assetDebtAllocations,
          clock,
        },
        { userId, assetId },
      ),
    );

    await purgeEntityBestEffort(userId, "account", assetId);
    await detectNotificationsForUser(userId);
  },
  revalidatePaths: (_data, assetId) => [`/app/patrimonio/${assetId}`],
});
