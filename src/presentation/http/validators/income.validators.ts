import { z } from "zod";

import { CURRENCIES } from "@/domain/value-objects/money.vo";

export const incomeFormSchema = z.object({
  label: z.string().min(1, "Informe um rótulo.").max(120),
  amountCents: z.coerce.bigint().positive("Valor deve ser positivo."),
  currency: z.enum(CURRENCIES).default("BRL"),
  frequency: z.enum(["monthly", "weekly", "one_off"]),
  startDate: z.coerce.date({ message: "Data inicial inválida." }),
  endDate: z
    .union([z.coerce.date(), z.literal("").transform(() => null)])
    .nullable()
    .default(null),
  // Dia do mês em que a renda mensal cai (1-31). Sem isso, a Carteira e a
  // timeline derivam do dia do cadastro e erram a data pra sempre.
  paymentDay: z
    .union([
      z.coerce.number().int().min(1, "Dia inválido.").max(31, "Dia inválido."),
      z.literal("").transform(() => null),
    ])
    .nullable()
    .default(null),
});

export type IncomeFormInput = z.infer<typeof incomeFormSchema>;
