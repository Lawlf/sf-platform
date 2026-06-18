"use server";

import { z } from "zod";

import { linkAssetToDebt } from "@/application/use-cases/asset/link-asset-to-debt.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  debtId: z.string().uuid(),
  allocationOriginalCents: z.string().regex(/^\d+$/, "Alocação inválida."),
});

export const linkDebtAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts", "timeline", "home"],
  handler: async (input, { userId, profileId }) => {
    unwrap(
      await linkAssetToDebt(
        {
          assets: repos.assets,
          allocations: repos.assetDebtAllocations,
          debts: repos.debts,
          clock,
        },
        {
          userId,
          profileId,
          assetId: input.assetId,
          debtId: input.debtId,
          allocationOriginalCents: BigInt(input.allocationOriginalCents),
        },
      ),
    );
  },
  revalidatePaths: (_data, input) => [`/app/patrimonio/${input.assetId}`],
});
