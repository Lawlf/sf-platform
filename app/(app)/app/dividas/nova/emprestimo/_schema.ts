import { z } from "zod";

import { linkAssetSlice } from "../_lib/link-asset";

export const cashInflowSlice = {
  cashTarget: z.enum(["existing", "new", "spent"]).nullable().optional(),
  existingCashAssetId: z.string().nullable().optional(),
  newCashAssetName: z.string().nullable().optional(),
  newCashAssetCurrentBalanceCents: z.bigint().nonnegative().nullable().optional(),
};

export const newScenarioSchema = z
  .object({
    scenario: z.literal("new"),
    label: z.string().min(1, "Informe um rótulo.").max(120),
    netReceivedCents: z.bigint().nonnegative("Valor recebido inválido."),
    principalCents: z.bigint().positive("Valor contratado deve ser positivo."),
    annualRatePct: z.number().min(0).max(200),
    termMonths: z.number().int().min(1).max(420),
    monthlyInstallmentCents: z.bigint().nonnegative(),
    startDate: z.string().min(1, "Informe a data de início."),
    expectedEndDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    ...linkAssetSlice,
    ...cashInflowSlice,
  })
  .refine((d) => d.netReceivedCents <= d.principalCents, {
    message: "Valor recebido não pode ser maior que o contratado.",
    path: ["netReceivedCents"],
  });

export const ongoingScenarioSchema = z
  .object({
    scenario: z.literal("ongoing"),
    label: z.string().min(1, "Informe um rótulo.").max(120),
    originalPrincipalCents: z.bigint().positive("Valor original deve ser positivo."),
    currentBalanceCents: z.bigint().positive("Saldo deve ser positivo."),
    monthlyInstallmentCents: z.bigint().positive("Parcela deve ser positiva."),
    paidInstallments: z.number().int().min(0).max(420),
    remainingTerms: z.number().int().min(1).max(420),
    annualRatePct: z.number().min(0).max(200),
    startDate: z.string().min(1, "Informe a data de início."),
    expectedEndDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    ...linkAssetSlice,
    ...cashInflowSlice,
  })
  .refine((d) => d.currentBalanceCents <= d.originalPrincipalCents, {
    message: "Saldo devedor não pode ser maior que o valor original contratado.",
    path: ["currentBalanceCents"],
  });

export const personalLoanFormSchema = z.discriminatedUnion("scenario", [
  newScenarioSchema,
  ongoingScenarioSchema,
]);

export type PersonalLoanFormValues = z.infer<typeof personalLoanFormSchema>;

export const NEW_STEP2_FIELDS = [
  "label",
  "netReceivedCents",
  "principalCents",
  "annualRatePct",
  "termMonths",
] as const;

export const ONGOING_STEP2_FIELDS = [
  "label",
  "originalPrincipalCents",
  "currentBalanceCents",
  "monthlyInstallmentCents",
  "paidInstallments",
  "remainingTerms",
  "annualRatePct",
] as const;

export const STEP3_FIELDS = ["startDate", "monthlyInstallmentCents"] as const;
