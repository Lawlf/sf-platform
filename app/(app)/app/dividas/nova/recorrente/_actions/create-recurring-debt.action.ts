"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

const schema = z.object({
  label: z.string().min(1).max(120),
  recurringFrequency: z.enum(["monthly", "weekly", "annual"]),
  recurringAmountCents: z.coerce.bigint().positive(),
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

export type CreateRecurringDebtResult =
  | { ok: true; debtId: string }
  | { ok: false; message: string };

export async function createRecurringDebtAction(
  formData: FormData,
): Promise<CreateRecurringDebtResult> {
  const parsed = schema.safeParse({
    label: formData.get("label"),
    recurringFrequency: formData.get("recurringFrequency"),
    recurringAmountCents: formData.get("recurringAmountCents"),
    expenseCategory: formData.get("expenseCategory"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    notes: formData.get("notes") || undefined,
    dueDay: formData.get("dueDay"),
  });
  if (!parsed.success) return { ok: false, message: "Dados invalidos." };

  const user = await requireUser();
  const r = await registerDebt(
    { debts: new DrizzleDebtRepository(), clock: new SystemClock() },
    {
      kind: "recurring",
      userId: user.id,
      label: parsed.data.label,
      recurringFrequency: parsed.data.recurringFrequency,
      recurringAmountCents: parsed.data.recurringAmountCents,
      expenseCategory: parsed.data.expenseCategory,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      notes: parsed.data.notes,
      dueDay: parsed.data.dueDay ?? null,
    },
  );
  if (!isOk(r)) return { ok: false, message: "Erro ao criar compromisso." };
  revalidatePath(`/app/dividas/${r.value.id}`);
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
  return { ok: true, debtId: r.value.id };
}
