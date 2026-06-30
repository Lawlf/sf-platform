import { z } from "zod";

import { CURRENCIES } from "@/domain/value-objects/money.vo";

import { linkAssetSlice } from "../_lib/link-asset";

export const newScenarioSchema = z.object({
  scenario: z.literal("new"),
  currency: z.enum(CURRENCIES),
  label: z.string().min(1, "Informe um nome.").max(120),
  principalCents: z.bigint().positive("Valor deve ser positivo."),
  annualRatePct: z.number().min(0).max(200),
  termMonths: z.number().int().min(1).max(600),
  monthlyInstallmentCents: z.bigint().nullable(),
  amortizationMethod: z.enum(["PRICE", "SAC"]),
  monthlyInsuranceCents: z.bigint().nullable(),
  monthlyAdminFeeCents: z.bigint().nullable(),
  startDate: z.string().min(1, "Informe a data de início."),
  expectedEndDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
  ...linkAssetSlice,
});

// Financiamento "antiga" (em andamento): a parcela é a fonte de verdade.
// Tudo mais (saldo, principal original, prazo total) é DERIVADO de
// parcela x contagens no form; o servidor recebe um stream flat (flat: true).
export const ongoingScenarioSchema = z.object({
  scenario: z.literal("ongoing"),
  currency: z.enum(CURRENCIES),
  label: z.string().min(1, "Informe um nome.").max(120),
  monthlyInstallmentCents: z.bigint().positive("Valor da parcela deve ser positivo."),
  annualRatePct: z.number().min(0).max(200),
  paidInstallments: z.number().int().min(0).max(600),
  remainingTerms: z.number().int().min(1, "Informe quantas parcelas faltam.").max(600),
  amortizationMethod: z.enum(["PRICE", "SAC"]),
  monthlyInsuranceCents: z.bigint().nullable(),
  monthlyAdminFeeCents: z.bigint().nullable(),
  startDate: z.string().min(1, "Informe a data de início."),
  expectedEndDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
  flat: z.literal(true),
  downPaymentCents: z.bigint().nullable().optional(),
  downPaymentDate: z.string().nullable().optional(),
  ...linkAssetSlice,
});

export const financingFormSchema = z.discriminatedUnion("scenario", [
  newScenarioSchema,
  ongoingScenarioSchema,
]);

export type FinancingFormValues = z.infer<typeof financingFormSchema>;

export const NEW_STEP2_FIELDS = [
  "label",
  "principalCents",
  "annualRatePct",
  "termMonths",
] as const;

export const ONGOING_STEP2_FIELDS = [
  "label",
  "monthlyInstallmentCents",
  "annualRatePct",
  "paidInstallments",
  "remainingTerms",
] as const;

export const STEP3_FIELDS = [
  "amortizationMethod",
  "startDate",
  "monthlyInsuranceCents",
  "monthlyAdminFeeCents",
] as const;
