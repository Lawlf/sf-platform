import { z } from "zod";

import { currencyEnum, nonNegativeBigint, nullableDate, positiveBigint } from "./shared.validators";

export const financingFormSchema = z.object({
  kind: z.literal("financing"),
  currency: currencyEnum,
  label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable().default(null),
  startDate: z.coerce.date(),
  expectedEndDate: nullableDate,
  principalCents: positiveBigint,
  annualRatePct: z
    .union([z.literal("").transform(() => null), z.coerce.number().min(0).max(200)])
    .nullable()
    .default(null),
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
  monthlyInstallmentCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  // Ongoing: saldo devedor atual difere do principal contratado.
  currentBalanceCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  paidInstallments: z
    .union([
      z.coerce.number().int().min(0).max(600),
      z.literal("").transform(() => null),
    ])
    .nullable()
    .default(null),
}).superRefine((d, ctx) => {
  if (d.annualRatePct === null && d.monthlyInstallmentCents === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["annualRatePct"],
      message: "Informe a taxa ou a parcela mensal.",
    });
  }
});

export const personalLoanFormSchema = z.object({
  kind: z.literal("personal_loan"),
  currency: currencyEnum,
  label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable().default(null),
  startDate: z.coerce.date(),
  expectedEndDate: nullableDate,
  principalCents: positiveBigint,
  annualRatePct: z
    .union([z.literal("").transform(() => null), z.coerce.number().min(0).max(200)])
    .nullable()
    .default(null),
  termMonths: z.coerce.number().int().min(1).max(600),
  monthlyInstallmentCents: positiveBigint,
  // Dia do vencimento da parcela (opcional). Vazio cai pro dia de startDate.
  dueDay: z
    .union([z.coerce.number().int().min(1).max(31), z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  // Ongoing scenario: saldo devedor atual difere do principal original.
  currentBalanceCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  // Parcelas já pagas no momento do cadastro (ongoing). Para reconciliar a linha do tempo.
  paidInstallments: z
    .union([
      z.coerce.number().int().min(0).max(600),
      z.literal("").transform(() => null),
    ])
    .nullable()
    .default(null),
});

export const installmentPurchaseItemSchema = z.object({
  description: z.string().min(1).max(120),
  totalCents: z
    .union([
      z.bigint().positive(),
      z.string().transform((v, ctx) => {
        try {
          const b = BigInt(v);
          if (b <= 0n) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total deve ser positivo." });
            return z.NEVER;
          }
          return b;
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total inválido." });
          return z.NEVER;
        }
      }),
    ])
    .pipe(z.bigint()),
  installmentsTotal: z.coerce.number().int().min(1).max(120),
  installmentsRemaining: z.coerce.number().int().min(0).max(120),
});

const installmentPurchasesField = z
  .union([
    z.literal("").transform(() => [] as z.infer<typeof installmentPurchaseItemSchema>[]),
    z.string().transform((v, ctx) => {
      try {
        const parsed = JSON.parse(v);
        const r = z.array(installmentPurchaseItemSchema).safeParse(parsed);
        if (!r.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: r.error.issues[0]?.message ?? "Compras parceladas inválidas.",
          });
          return z.NEVER;
        }
        return r.data;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Compras parceladas: JSON inválido." });
        return z.NEVER;
      }
    }),
  ])
  .default(() => []);

export const creditCardFormSchema = z.object({
  kind: z.literal("credit_card"),
  currency: currencyEnum,
  label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable().default(null),
  startDate: z.coerce.date(),
  expectedEndDate: nullableDate,
  creditLimitCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .nullable()
    .default(null),
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
  installmentPurchasesJson: installmentPurchasesField,
}).superRefine((d, ctx) => {
  if (d.creditLimitCents === null) return;
  const used = d.currentStatementCents + (d.revolvingBalanceCents ?? 0n);
  if (used > d.creditLimitCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["currentStatementCents"],
      message: "A fatura mais o rotativo não podem passar do limite do cartão.",
    });
  }
});

export const overdraftFormSchema = z.object({
  kind: z.literal("overdraft"),
  currency: currencyEnum,
  label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable().default(null),
  startDate: z.coerce.date(),
  expectedEndDate: nullableDate,
  currentBalanceCents: positiveBigint,
  bankName: z.string().min(1).max(120),
  monthlyRatePct: z.coerce.number().min(0).max(1000),
});

export type FinancingFormInput = z.infer<typeof financingFormSchema>;
export type PersonalLoanFormInput = z.infer<typeof personalLoanFormSchema>;
export type CreditCardFormInput = z.infer<typeof creditCardFormSchema>;
export type OverdraftFormInput = z.infer<typeof overdraftFormSchema>;
