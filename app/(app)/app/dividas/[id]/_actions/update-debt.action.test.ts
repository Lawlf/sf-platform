import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildUpdateMoneyInput } from "./update-debt.money";

const bigintFromString = z
  .string()
  .min(1)
  .transform((v, ctx) => {
    try {
      return BigInt(v);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número inválido." });
      return z.NEVER;
    }
  });

const positiveBigint = bigintFromString.refine((v) => v > 0n, "Deve ser positivo.");
const nonNegativeBigint = bigintFromString.refine((v) => v >= 0n, "Não pode ser negativo.");
const optionalMoney = z
  .union([nonNegativeBigint, z.literal("").transform(() => null)])
  .nullable()
  .optional();

const schema = z.object({
  debtId: z.string().uuid(),
  currentBalanceCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .optional(),
  monthlyInstallmentCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .optional(),
  monthlyInsuranceCents: optionalMoney,
  monthlyAdminFeeCents: optionalMoney,
  creditLimitCents: z
    .union([positiveBigint, z.literal("").transform(() => null)])
    .optional(),
  currentStatementCents: z
    .union([nonNegativeBigint, z.literal("").transform(() => null)])
    .optional(),
  revolvingBalanceCents: optionalMoney,
});

function parse(raw: Record<string, string>) {
  const r = schema.safeParse({ debtId: "00000000-0000-0000-0000-000000000000", ...raw });
  if (!r.success) throw new Error("test setup parse fail");
  return r.data;
}

describe("buildUpdateMoneyInput", () => {
  it("keeps a USD debt in USD when the form does not change currency", () => {
    const d = parse({ currentBalanceCents: "150000" });
    const out = buildUpdateMoneyInput(d, "USD");
    expect(out.currentBalance?.currency).toBe("USD");
    expect(out.currentBalance?.toCents()).toBe(150000n);
  });

  it("builds every credit_card money field with the loaded currency", () => {
    const d = parse({
      creditLimitCents: "1000000",
      currentStatementCents: "150000",
      revolvingBalanceCents: "80000",
    });
    const out = buildUpdateMoneyInput(d, "USD");
    expect(out.creditLimit?.currency).toBe("USD");
    expect(out.currentStatement?.currency).toBe("USD");
    expect(out.revolvingBalance?.currency).toBe("USD");
  });

  it("defaults BRL flows to BRL byte-identical", () => {
    const d = parse({ currentBalanceCents: "5000" });
    const out = buildUpdateMoneyInput(d, "BRL");
    expect(out.currentBalance?.currency).toBe("BRL");
    expect(out.currentBalance?.toCents()).toBe(5000n);
  });
});
