"use server";

import { z } from "zod";

import { linkCostCategory } from "@/application/use-cases/asset/link-cost-category.use-case";
import { unlinkCostCategory } from "@/application/use-cases/asset/unlink-cost-category.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const linkCostCategoryAction = action({
  schema: z.object({ assetId: z.string().uuid(), categoryKey: z.string().min(1) }),
  revalidates: ["assets", "home"],
  handler: async ({ assetId, categoryKey }, { profileId }) => {
    unwrap(
      await linkCostCategory(
        { costCategories: repos.assetCostCategories, assets: repos.assets, clock },
        { profileId, assetId, categoryKey },
      ),
    );
    return { categoryKey };
  },
  revalidatePaths: (_d, { assetId }) => [`/app/patrimonio/${assetId}`],
});

export const unlinkCostCategoryAction = action({
  schema: z.object({ assetId: z.string().uuid(), categoryKey: z.string().min(1) }),
  revalidates: ["assets", "home"],
  handler: async ({ categoryKey }, { profileId }) => {
    unwrap(await unlinkCostCategory({ costCategories: repos.assetCostCategories }, { profileId, categoryKey }));
    return { categoryKey };
  },
  revalidatePaths: (_d, { assetId }) => [`/app/patrimonio/${assetId}`],
});
