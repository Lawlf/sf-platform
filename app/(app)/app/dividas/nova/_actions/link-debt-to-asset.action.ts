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

export type LinkDebtToAssetInput = z.input<typeof inputSchema>;

export const linkDebtToAssetAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts"],
  handler: async (v, { userId }) => {
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
          assetId: v.assetId,
          debtId: v.debtId,
          allocationOriginalCents: BigInt(v.allocationOriginalCents),
        },
      ),
    );
  },
  revalidatePaths: (_data, v) => [
    `/app/patrimonio/${v.assetId}`,
    `/app/dividas/${v.debtId}`,
  ],
});
