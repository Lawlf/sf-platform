import { z } from "zod";

import { currencyEnum, nullableDate } from "./shared.validators";

export const incomeFormSchema = z.object({
  label: z.string().min(1, "Informe um rótulo.").max(120),
  amountCents: z.coerce.bigint().positive("Valor deve ser positivo."),
  currency: currencyEnum,
  frequency: z.enum(["monthly", "weekly", "one_off"]),
  startDate: z.coerce.date({ message: "Data inicial inválida." }),
  endDate: nullableDate,
  // Dia do mês em que a renda mensal cai (1-31). Sem isso, a Carteira e a
  // timeline derivam do dia do cadastro e erram a data pra sempre.
  paymentDay: z
    .union([
      z.coerce.number().int().min(1, "Dia inválido.").max(31, "Dia inválido."),
      z.literal("").transform(() => null),
    ])
    .nullable()
    .default(null),
  isEstimated: z
    .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === true || v === "true"),
});

export type IncomeFormInput = z.infer<typeof incomeFormSchema>;
