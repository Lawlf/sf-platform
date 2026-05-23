import { z } from "zod";

import { linkAssetSlice } from "../_lib/link-asset";

export const newScenarioSchema = z.object({
  scenario: z.literal("new"),
  label: z.string().min(1, "Informe um rótulo.").max(120),
  principalCents: z.bigint().positive("Valor deve ser positivo."),
  annualRatePct: z.number().min(0).max(200),
  termMonths: z.number().int().min(1).max(600),
  amortizationMethod: z.enum(["PRICE", "SAC"]),
  monthlyInsuranceCents: z.bigint().nullable(),
  monthlyAdminFeeCents: z.bigint().nullable(),
  startDate: z.string().min(1, "Informe a data de início."),
  expectedEndDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
  ...linkAssetSlice,
});

export const ongoingScenarioSchema = z
  .object({
    scenario: z.literal("ongoing"),
    label: z.string().min(1, "Informe um rótulo.").max(120),
    originalPrincipalCents: z.bigint().positive("Valor original deve ser positivo."),
    currentBalanceCents: z.bigint().positive("Saldo devedor deve ser positivo."),
    annualRatePct: z.number().min(0).max(200),
    paidInstallments: z.number().int().min(0).max(600),
    remainingTerms: z.number().int().min(1).max(600),
    amortizationMethod: z.enum(["PRICE", "SAC"]),
    monthlyInsuranceCents: z.bigint().nullable(),
    monthlyAdminFeeCents: z.bigint().nullable(),
    startDate: z.string().min(1, "Informe a data de início."),
    expectedEndDate: z.string().nullable().optional(),
    notes: z.string().optional().nullable(),
    ...linkAssetSlice,
  })
  .refine((d) => d.currentBalanceCents <= d.originalPrincipalCents, {
    message: "Saldo devedor não pode ser maior que o valor original.",
    path: ["currentBalanceCents"],
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
  "originalPrincipalCents",
  "currentBalanceCents",
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
