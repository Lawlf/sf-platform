import { z } from "zod";

import { CURRENCIES } from "@/domain/value-objects/money.vo";

export const bigintFromString = z
  .string()
  .min(1, "Campo obrigatório.")
  .transform((v, ctx) => {
    try {
      return BigInt(v);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número inválido." });
      return z.NEVER;
    }
  });

export const positiveBigint = bigintFromString.refine((v) => v > 0n, "Deve ser positivo.");
export const nonNegativeBigint = bigintFromString.refine(
  (v) => v >= 0n,
  "Não pode ser negativo.",
);

export const currencyEnum = z.enum(CURRENCIES).default("BRL");

export const nullableDate = z
  .union([z.coerce.date(), z.literal("").transform(() => null)])
  .nullable()
  .default(null);
