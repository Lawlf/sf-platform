"use server";

import { z } from "zod";

import {
  updateDebt,
  type UpdateDebtInput,
} from "@/application/use-cases/debt/update-debt.use-case";
import { normalizeLegacyExpenseCategory } from "@/domain/categories/default-categories";
import { activeCategories, resolveCategories } from "@/domain/categories/resolve-categories";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError, unwrap } from "@/presentation/actions/action";
import { installmentPurchaseItemSchema } from "@/presentation/http/validators/debt.validators";
import { isOk } from "@/shared/errors/result";

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
  expenseCategory: z.string().min(1).optional(),
  installmentPurchasesJson: z.string().optional(),
});

const installmentPurchasesPayloadSchema = z
  .array(
    installmentPurchaseItemSchema.refine(
      (d) => d.installmentsRemaining <= d.installmentsTotal,
      { message: "Restantes não pode ser maior que o total.", path: ["installmentsRemaining"] },
    ),
  );

export type ParsedUpdate = z.infer<typeof schema>;

export const updateDebtAction = action({
  schema,
  revalidates: ["debts", "timeline", "notifications", "home"],
  handler: async (d, { userId }) => {
    const debts = repos.debts;
    const existing = await debts.findById(d.debtId);
    if (!existing || existing.userId !== userId) {
      throw new ActionError("Dívida não encontrada.");
    }
    const currency = existing.currentBalance.currency;

    let annualInterestRate: InterestRate | undefined;
    if (d.annualRatePct != null) {
      const r = InterestRate.fromAnnual(d.annualRatePct / 100);
      if (!isOk(r)) throw new ActionError("Taxa anual inválida.");
      annualInterestRate = r.value;
    }

    let revolvingMonthlyRate: InterestRate | null | undefined;
    if (d.revolvingMonthlyRatePct !== undefined) {
      if (d.revolvingMonthlyRatePct === null) {
        revolvingMonthlyRate = null;
      } else {
        const r = InterestRate.fromMonthly(d.revolvingMonthlyRatePct / 100);
        if (!isOk(r)) throw new ActionError("Taxa rotativo inválida.");
        revolvingMonthlyRate = r.value;
      }
    }

    let overdraftMonthlyRate: InterestRate | undefined;
    if (d.monthlyRatePct != null) {
      const r = InterestRate.fromMonthly(d.monthlyRatePct / 100);
      if (!isOk(r)) throw new ActionError("Taxa mensal inválida.");
      overdraftMonthlyRate = r.value;
    }

    const input: UpdateDebtInput = { userId, debtId: d.debtId, ...buildUpdateMoneyInput(d, currency) };
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
    if (d.expenseCategory !== undefined) {
      const expenseCategory = normalizeLegacyExpenseCategory(d.expenseCategory);
      const rows = await repos.userCategories.listForUser(userId);
      const valid = activeCategories(resolveCategories("expense", rows)).some(
        (c) => c.key === expenseCategory,
      );
      if (!valid) throw new ActionError("Categoria inválida.");
      input.expenseCategory = expenseCategory;
    }

    if (d.installmentPurchasesJson !== undefined) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(d.installmentPurchasesJson);
      } catch {
        throw new ActionError("Compras parceladas: JSON inválido.");
      }
      const r = installmentPurchasesPayloadSchema.safeParse(parsedJson);
      if (!r.success) {
        throw new ActionError(r.error.issues[0]?.message ?? "Compras parceladas inválidas.");
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
    }

    unwrap(await updateDebt({ debts, clock }, input));

    await detectNotificationsForUser(userId);
    return { debtId: d.debtId };
  },
  revalidatePaths: (_data, { debtId }) => [`/app/dividas/${debtId}`],
});
