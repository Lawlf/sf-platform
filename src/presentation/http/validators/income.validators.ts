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
});

export type IncomeFormInput = z.infer<typeof incomeFormSchema>;
