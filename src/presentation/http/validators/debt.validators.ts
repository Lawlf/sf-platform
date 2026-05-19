import { z } from "zod";

const bigintFromString = z
  .string()
  .min(1, "Campo obrigatorio.")
  .transform((v, ctx) => {
    try {
      return BigInt(v);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Numero invalido." });
      return z.NEVER;
    }
  });

const positiveBigint = bigintFromString.refine((v) => v > 0n, "Deve ser positivo.");
const nonNegativeBigint = bigintFromString.refine((v) => v >= 0n, "Nao pode ser negativo.");

export const financingFormSchema = z.object({
  kind: z.literal("financing"),
  label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable().default(null),
  startDate: z.coerce.date(),
  expectedEndDate: z
    .union([z.coerce.date(), z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  principalCents: positiveBigint,
  annualRatePct: z.coerce.number().min(0).max(1000),
  termMonths: z.coerce.number().int().min(1).max(600),
  amortizationMethod: z.enum(["PRICE", "SAC"]),
  monthlyInsuranceCents: z
    .union([nonNegativeBigint, z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  monthlyAdminFeeCents: z
    .union([nonNegativeBigint, z.literal("").transform(() => null)])
    .nullable()
    .default(null),
});

export const personalLoanFormSchema = z.object({
  kind: z.literal("personal_loan"),
  label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable().default(null),
  startDate: z.coerce.date(),
  expectedEndDate: z
    .union([z.coerce.date(), z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  principalCents: positiveBigint,
  annualRatePct: z.coerce.number().min(0).max(1000),
  termMonths: z.coerce.number().int().min(1).max(600),
  monthlyInstallmentCents: positiveBigint,
});

export const creditCardFormSchema = z.object({
  kind: z.literal("credit_card"),
  label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable().default(null),
  startDate: z.coerce.date(),
  expectedEndDate: z
    .union([z.coerce.date(), z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  creditLimitCents: positiveBigint,
  currentStatementCents: nonNegativeBigint,
  statementDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  revolvingBalanceCents: z
    .union([nonNegativeBigint, z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  revolvingMonthlyRatePct: z
    .union([z.coerce.number().min(0).max(1000), z.literal("").transform(() => null)])
    .nullable()
    .default(null),
});

export const overdraftFormSchema = z.object({
  kind: z.literal("overdraft"),
  label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable().default(null),
  startDate: z.coerce.date(),
  expectedEndDate: z
    .union([z.coerce.date(), z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  currentBalanceCents: positiveBigint,
  bankName: z.string().min(1).max(120),
  monthlyRatePct: z.coerce.number().min(0).max(1000),
});

export type FinancingFormInput = z.infer<typeof financingFormSchema>;
export type PersonalLoanFormInput = z.infer<typeof personalLoanFormSchema>;
export type CreditCardFormInput = z.infer<typeof creditCardFormSchema>;
export type OverdraftFormInput = z.infer<typeof overdraftFormSchema>;
