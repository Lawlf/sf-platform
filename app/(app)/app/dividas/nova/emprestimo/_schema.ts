import { z } from "zod";

import { CURRENCIES } from "@/domain/value-objects/money.vo";

import { linkAssetSlice } from "../_lib/link-asset";

// Dia do vencimento (1-31). Opcional; o input usa setValueAs pra mandar null
// quando vazio (em vez de NaN), então aqui basta nullable.
const dueDayField = z.number().int().min(1).max(31).nullable();

function endsAfterStart(d: {
  startDate: string;
  expectedEndDate?: string | null | undefined;
}): boolean {
  if (!d.expectedEndDate) return true;
  const start = new Date(d.startDate);
  const end = new Date(d.expectedEndDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
  return end.getTime() >= start.getTime();
}

export const cashInflowSlice = {
  cashTarget: z.enum(["existing", "new", "spent"]).nullable().optional(),
  existingCashAssetId: z.string().nullable().optional(),
  newCashAssetName: z.string().nullable().optional(),
  newCashAssetCurrentBalanceCents: z.bigint().nonnegative().nullable().optional(),
};

export const newScenarioSchema = z
  .object({
    scenario: z.literal("new"),
    currency: z.enum(CURRENCIES),
    label: z.string().min(1, "Informe um nome.").max(120),
    netReceivedCents: z.bigint().nonnegative("Valor recebido inválido."),
    principalCents: z.bigint().positive("Valor contratado deve ser positivo."),
    annualRatePct: z.number().min(0).max(200),
    termMonths: z.number().int().min(1).max(420),
    monthlyInstallmentCents: z.bigint().nonnegative(),
    dueDay: dueDayField,
    startDate: z.string().min(1, "Informe a data de início."),
    expectedEndDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    ...linkAssetSlice,
    ...cashInflowSlice,
  })
  .refine((d) => d.netReceivedCents <= d.principalCents, {
    message: "Valor recebido não pode ser maior que o contratado.",
    path: ["netReceivedCents"],
  })
  .refine((d) => endsAfterStart(d), {
    message: "A data de término não pode ser antes do início.",
    path: ["expectedEndDate"],
  });

export const ongoingScenarioSchema = z
  .object({
    scenario: z.literal("ongoing"),
    currency: z.enum(CURRENCIES),
    label: z.string().min(1, "Informe um nome.").max(120),
    // Empréstimo de parcela fixa: o usuário informa parcela + total de vezes +
    // quantas já pagou. Saldo, valor contratado e total pago são derivados.
    monthlyInstallmentCents: z.bigint().positive("Parcela deve ser positiva."),
    totalInstallments: z.number().int().min(1, "Informe em quantas vezes.").max(420),
    paidInstallments: z.number().int().min(0).max(420),
    annualRatePct: z.number().min(0).max(200),
    dueDay: dueDayField,
    startDate: z.string().min(1, "Informe a data de início."),
    expectedEndDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    ...linkAssetSlice,
    ...cashInflowSlice,
  })
  .refine((d) => d.paidInstallments < d.totalInstallments, {
    message: "As parcelas pagas não podem ser iguais ou mais que o total.",
    path: ["paidInstallments"],
  })
  .refine((d) => endsAfterStart(d), {
    message: "A data de término não pode ser antes do início.",
    path: ["expectedEndDate"],
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
  "monthlyInstallmentCents",
  "totalInstallments",
  "paidInstallments",
] as const;

export const STEP3_FIELDS = ["startDate", "monthlyInstallmentCents"] as const;
