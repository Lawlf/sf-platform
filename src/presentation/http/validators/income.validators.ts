import { z } from "zod";

export const incomeFormSchema = z.object({
  label: z.string().min(1, "Informe um rotulo.").max(120),
  amountCents: z.coerce.bigint().positive("Valor deve ser positivo."),
  frequency: z.enum(["monthly", "weekly", "one_off"]),
  startDate: z.coerce.date({ message: "Data inicial invalida." }),
  endDate: z
    .union([z.coerce.date(), z.literal("").transform(() => null)])
    .nullable()
    .default(null),
});

export type IncomeFormInput = z.infer<typeof incomeFormSchema>;
