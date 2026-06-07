"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  updateDebt,
  type UpdateDebtInput,
} from "@/application/use-cases/debt/update-debt.use-case";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { installmentPurchaseItemSchema } from "@/presentation/http/validators/debt.validators";
import { isErr, isOk } from "@/shared/errors/result";

import { detectNotificationsForUser } from "../../../_actions/_notifications";

import { buildUpdateMoneyInput } from "./update-debt.money";

const bigintFromString = z
  .string()
  .min(1)
  .transform((v, ctx) => {
    try {
      return BigInt(v);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número inválido." });
      return z.NEVER;
    }
  });

const positiveBigint = bigintFromString.refine((v) => v > 0n, "Deve ser positivo.");
const nonNegativeBigint = bigintFromString.refine((v) => v >= 0n, "Não pode ser negativo.");

const optionalMoney = z
  .union([nonNegativeBigint, z.literal("").transform(() => null)])
  .nullable()
  .optional();

const schema = z.object({
  debtId: z.string().uuid(),
  label: z.string().min(1).max(120).optional(),
  notes: z.union([z.string().max(1000), z.literal("").transform(() => null)]).optional(),
  expectedEndDate: z
    .union([z.coerce.date(), z.literal("").transform(() => null)])
    .optional(),
  currentBalanceCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .optional(),
  annualRatePct: z
    .union([z.coerce.number().min(0).max(1000), z.literal("").transform(() => null)])
    .optional(),
  monthlyInstallmentCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .optional(),
  monthlyInsuranceCents: optionalMoney,
  monthlyAdminFeeCents: optionalMoney,
  creditLimitCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .optional(),
  currentStatementCents: z
    .union([nonNegativeBigint, z.literal("").transform(() => null)])
    .optional(),
  statementDay: z
    .union([z.coerce.number().int().min(1).max(31), z.literal("").transform(() => null)])
    .optional(),
  dueDay: z
    .union([z.coerce.number().int().min(1).max(31), z.literal("").transform(() => null)])
    .optional(),
  revolvingBalanceCents: optionalMoney,
  revolvingMonthlyRatePct: z
    .union([z.coerce.number().min(0).max(1000), z.literal("").transform(() => null)])
    .optional(),
  bankName: z.string().min(1).max(120).optional(),
  monthlyRatePct: z
    .union([z.coerce.number().min(0).max(1000), z.literal("").transform(() => null)])
    .optional(),
  recurringAmountCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .optional(),
  recurringFrequency: z.enum(["monthly", "weekly", "annual"]).optional(),
  expenseCategory: z
    .enum([
      "housing",
      "utilities",
      "food",
      "transport",
      "health",
      "leisure",
      "subscriptions",
      "education",
      "other",
    ])
    .optional(),
  installmentPurchasesJson: z.string().optional(),
});

const installmentPurchasesPayloadSchema = z
  .array(
    installmentPurchaseItemSchema.refine(
      (d) => d.installmentsRemaining <= d.installmentsTotal,
      { message: "Restantes não pode ser maior que o total.", path: ["installmentsRemaining"] },
    ),
  );

export type UpdateDebtResult = { ok: true; debtId: string } | { ok: false; message: string };

export type ParsedUpdate = z.infer<typeof schema>;

export async function updateDebtAction(formData: FormData): Promise<UpdateDebtResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }
  const d = parsed.data;

  const debts = new DrizzleDebtRepository();
  const existing = await debts.findById(d.debtId);
  if (!existing || existing.userId !== user.id) {
    return { ok: false, message: "Dívida não encontrada." };
  }
  const currency = existing.currentBalance.currency;

  let annualInterestRate: InterestRate | undefined;
  if (d.annualRatePct != null) {
    const r = InterestRate.fromAnnual(d.annualRatePct / 100);
    if (!isOk(r)) return { ok: false, message: "Taxa anual inválida." };
    annualInterestRate = r.value;
  }

  let revolvingMonthlyRate: InterestRate | null | undefined;
  if (d.revolvingMonthlyRatePct !== undefined) {
    if (d.revolvingMonthlyRatePct === null) {
      revolvingMonthlyRate = null;
    } else {
      const r = InterestRate.fromMonthly(d.revolvingMonthlyRatePct / 100);
      if (!isOk(r)) return { ok: false, message: "Taxa rotativo inválida." };
      revolvingMonthlyRate = r.value;
    }
  }

  let overdraftMonthlyRate: InterestRate | undefined;
  if (d.monthlyRatePct != null) {
    const r = InterestRate.fromMonthly(d.monthlyRatePct / 100);
    if (!isOk(r)) return { ok: false, message: "Taxa mensal inválida." };
    overdraftMonthlyRate = r.value;
  }

  const input: UpdateDebtInput = { userId: user.id, debtId: d.debtId, ...buildUpdateMoneyInput(d, currency) };
  if (d.label !== undefined) input.label = d.label;
  if (d.notes !== undefined) input.notes = d.notes;
  if (d.expectedEndDate !== undefined) input.expectedEndDate = d.expectedEndDate;
  if (annualInterestRate !== undefined) input.annualInterestRate = annualInterestRate;
  if (d.statementDay != null) input.statementDay = d.statementDay;
  if (d.dueDay != null) input.dueDay = d.dueDay;
  if (revolvingMonthlyRate !== undefined) input.revolvingMonthlyRate = revolvingMonthlyRate;
  if (d.bankName !== undefined) input.bankName = d.bankName;
  if (overdraftMonthlyRate !== undefined) input.monthlyRate = overdraftMonthlyRate;
  if (d.recurringAmountCents != null) input.recurringAmountCents = d.recurringAmountCents;
  if (d.recurringFrequency !== undefined) input.recurringFrequency = d.recurringFrequency;
  if (d.expenseCategory !== undefined) input.expenseCategory = d.expenseCategory;

  if (d.installmentPurchasesJson !== undefined) {
    try {
      const parsed = JSON.parse(d.installmentPurchasesJson);
      const r = installmentPurchasesPayloadSchema.safeParse(parsed);
      if (!r.success) {
        return {
          ok: false,
          message: r.error.issues[0]?.message ?? "Compras parceladas inválidas.",
        };
      }
      input.installmentPurchases = r.data.map((p) => {
        const monthlyCents = p.totalCents / BigInt(p.installmentsTotal);
        return {
          description: p.description,
          total: Money.fromCents(p.totalCents, currency),
          installmentsTotal: p.installmentsTotal,
          installmentsRemaining: p.installmentsRemaining,
          monthlyValue: Money.fromCents(monthlyCents, currency),
        };
      });
    } catch {
      return { ok: false, message: "Compras parceladas: JSON inválido." };
    }
  }

  const r = await updateDebt({ debts, clock: new SystemClock() }, input);
  if (isErr(r)) return { ok: false, message: r.error.message };

  await detectNotificationsForUser(user.id);
  revalidatePath(`/app/dividas/${d.debtId}`);
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
  return { ok: true, debtId: d.debtId };
}
