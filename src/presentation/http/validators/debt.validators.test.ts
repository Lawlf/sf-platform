import { describe, expect, it } from "vitest";

import {
  creditCardFormSchema,
  financingFormSchema,
  personalLoanFormSchema,
} from "./debt.validators";

const baseCard = {
  kind: "credit_card",
  label: "Nubank",
  currentStatementCents: "50000",
  statementDay: "1",
  dueDay: "10",
  startDate: "2026-06-01",
};

describe("creditCardFormSchema — limite opcional", () => {
  it("aceita limite em branco (null)", () => {
    const r = creditCardFormSchema.safeParse({ ...baseCard, creditLimitCents: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.creditLimitCents).toBeNull();
  });

  it("nao roda o check fatura<=limite quando limite ausente", () => {
    const r = creditCardFormSchema.safeParse({
      ...baseCard,
      creditLimitCents: "",
      currentStatementCents: "999999999",
    });
    expect(r.success).toBe(true);
  });

  it("ainda bloqueia fatura > limite quando limite informado", () => {
    const r = creditCardFormSchema.safeParse({
      ...baseCard,
      creditLimitCents: "10000",
      currentStatementCents: "20000",
    });
    expect(r.success).toBe(false);
  });
});

describe("personalLoanFormSchema — taxa opcional", () => {
  it("aceita taxa anual em branco", () => {
    const r = personalLoanFormSchema.safeParse({
      kind: "personal_loan",
      label: "Empréstimo",
      startDate: "2026-06-01",
      principalCents: "1000000",
      annualRatePct: "",
      termMonths: "24",
      monthlyInstallmentCents: "50000",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.annualRatePct).toBeNull();
  });
});

describe("financingFormSchema — taxa OU parcela", () => {
  const base = {
    kind: "financing",
    label: "Financiamento",
    startDate: "2026-06-01",
    principalCents: "10000000",
    termMonths: "60",
    amortizationMethod: "PRICE",
  };
  it("aceita parcela sem taxa", () => {
    const r = financingFormSchema.safeParse({
      ...base,
      annualRatePct: "",
      monthlyInstallmentCents: "200000",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita taxa E parcela ambas em branco", () => {
    const r = financingFormSchema.safeParse({
      ...base,
      annualRatePct: "",
      monthlyInstallmentCents: "",
    });
    expect(r.success).toBe(false);
  });
  it("aceita taxa sem parcela", () => {
    const r = financingFormSchema.safeParse({
      ...base,
      annualRatePct: "12",
      monthlyInstallmentCents: "",
    });
    expect(r.success).toBe(true);
  });
});
