"use server";

import { z } from "zod";

import { archiveCategory } from "@/application/use-cases/category/archive-category.use-case";
import { createCategory } from "@/application/use-cases/category/create-category.use-case";
import { renameCategory } from "@/application/use-cases/category/rename-category.use-case";
import { unarchiveCategory } from "@/application/use-cases/category/unarchive-category.use-case";
import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const domainSchema = z.enum(["expense", "inflow"]);

const createSchema = z.object({
  domain: domainSchema,
  name: z.string(),
  icon: z.string(),
});

const renameSchema = z.object({
  domain: domainSchema,
  key: z.string().min(1),
  name: z.string(),
});

const archiveSchema = z.object({
  domain: domainSchema,
  key: z.string().min(1),
  destinationKey: z.string().nullable(),
});

const unarchiveSchema = z.object({
  domain: domainSchema,
  key: z.string().min(1),
});

const REVALIDATES = ["timeline", "report", "debts"] as const;

export const createCategoryAction = action({
  schema: createSchema,
  revalidates: REVALIDATES,
  handler: async (input, { userId }) => {
    const user = await requireUser();
    const created = await createCategory(
      { userCategories: repos.userCategories },
      { userId, isPro: user.isPro, input },
    );
    return { key: created.id };
  },
});

export const renameCategoryAction = action({
  schema: renameSchema,
  revalidates: REVALIDATES,
  handler: async (input, { userId }) => {
    const user = await requireUser();
    await renameCategory(
      { userCategories: repos.userCategories },
      { userId, isPro: user.isPro, ...input },
    );
  },
});

export const archiveCategoryAction = action({
  schema: archiveSchema,
  revalidates: REVALIDATES,
  handler: async (input, { userId, profileId }) => {
    const user = await requireUser();
    await archiveCategory(
      {
        userCategories: repos.userCategories,
        transactions: repos.transactions,
        debts: repos.debts,
      },
      { userId, profileId, isPro: user.isPro, ...input },
    );
  },
});

export const unarchiveCategoryAction = action({
  schema: unarchiveSchema,
  revalidates: REVALIDATES,
  handler: async (input, { userId }) => {
    const user = await requireUser();
    await unarchiveCategory(
      { userCategories: repos.userCategories },
      { userId, isPro: user.isPro, ...input },
    );
  },
});
