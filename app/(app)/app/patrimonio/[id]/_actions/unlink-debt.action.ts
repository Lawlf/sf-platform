"use server";

import { z } from "zod";

import { unlinkAssetFromDebt } from "@/application/use-cases/asset/unlink-asset-from-debt.use-case";
import { repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  debtId: z.string().uuid(),
});

export const unlinkDebtAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts", "timeline", "home"],
  handler: async (input, { profileId }) => {
    unwrap(
      await unlinkAssetFromDebt(
        {
          assets: repos.assets,
          allocations: repos.assetDebtAllocations,
        },
        {
          profileId,
          assetId: input.assetId,
          debtId: input.debtId,
        },
      ),
    );
  },
  revalidatePaths: (_data, input) => [`/app/patrimonio/${input.assetId}`],
});
