"use server";

import { z } from "zod";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import { normalizeLegacyExpenseCategory } from "@/domain/categories/default-categories";
import { activeCategories, resolveCategories } from "@/domain/categories/resolve-categories";
import { CURRENCIES } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError } from "@/presentation/actions/action";
import { isOk } from "@/shared/errors/result";

import { awardEventAchievement } from "../../../../_actions/_achievements";

const schema = z.object({
  label: z.string().min(1).max(120),
  recurringFrequency: z.enum(["monthly", "weekly", "annual"]),
  recurringAmountCents: z.coerce.bigint().positive(),
  currency: z.enum(CURRENCIES).default("BRL"),
  expenseCategory: z.string().min(1).default("outros"),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  dueDay: z
    .union([z.coerce.number().int().min(1).max(31), z.literal("").transform(() => null)])
    .nullable()
    .optional(),
});

export const createRecurringDebtAction = action({
  schema,
  revalidates: ["debts", "timeline", "notifications", "home"],
  handler: async (d, { userId, profileId }) => {
    const expenseCategory = normalizeLegacyExpenseCategory(d.expenseCategory);
    const rows = await repos.userCategories.listForUser(userId);
    const valid = activeCategories(resolveCategories("expense", rows)).some(
      (c) => c.key === expenseCategory,
    );
    if (!valid) throw new ActionError("Categoria inválida.");
    const r = await registerDebt(
      { debts: repos.debts, clock },
      {
        kind: "recurring",
        userId,
        profileId,
        label: d.label,
        recurringFrequency: d.recurringFrequency,
        recurringAmountCents: d.recurringAmountCents,
        currency: d.currency,
        expenseCategory,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        notes: d.notes || undefined,
        dueDay: d.dueDay ?? null,
      },
    );
    if (!isOk(r)) throw new ActionError("Erro ao criar compromisso.");
    await awardEventAchievement(userId, "primeiro-passo");
    return { debtId: r.value.id };
  },
  revalidatePaths: (data) => [`/app/dividas/${data.debtId}`],
});
