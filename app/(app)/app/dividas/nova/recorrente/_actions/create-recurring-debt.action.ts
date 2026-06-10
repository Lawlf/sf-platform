"use server";

import { z } from "zod";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
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
  expenseCategory: z.enum([
    "housing",
    "utilities",
    "food",
    "transport",
    "health",
    "leisure",
    "subscriptions",
    "education",
    "other",
  ]),
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
  handler: async (d, { userId }) => {
    const r = await registerDebt(
      { debts: repos.debts, clock },
      {
        kind: "recurring",
        userId,
        label: d.label,
        recurringFrequency: d.recurringFrequency,
        recurringAmountCents: d.recurringAmountCents,
        currency: d.currency,
        expenseCategory: d.expenseCategory,
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
