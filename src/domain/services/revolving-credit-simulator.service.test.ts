import { describe, expect, it } from "vitest";

import { RevolvingCreditSimulatorService } from "./revolving-credit-simulator.service";

describe("RevolvingCreditSimulatorService.simulate", () => {
  it("fatura zerada quita na hora, sem juro", () => {
    const r = RevolvingCreditSimulatorService.simulate({
      statementCents: 0n,
      monthlyPaymentCents: 30_000n,
      monthlyRate: 0.15,
    });
    expect(r.paysOff).toBe(true);
    expect(r.payoffMonth).toBe(0);
    expect(r.totalInterestCents).toBe(0n);
  });

  it("pagar o mínimo exato (15%) com juro de 15% nunca diminui a fatura", () => {
    // Fatura R$2.000, paga R$300 (15%), juro 15% a.m. => juro do mês = R$300 = pagamento.
    const r = RevolvingCreditSimulatorService.simulate({
      statementCents: 200_000n,
      monthlyPaymentCents: 30_000n,
      monthlyRate: 0.15,
    });
    expect(r.paysOff).toBe(false);
    expect(r.payoffMonth).toBeNull();
    expect(r.firstMonthInterestCents).toBe(30_000n);
  });

  it("pagamento abaixo do juro nunca quita", () => {
    const r = RevolvingCreditSimulatorService.simulate({
      statementCents: 200_000n,
      monthlyPaymentCents: 20_000n,
      monthlyRate: 0.15,
    });
    expect(r.paysOff).toBe(false);
    expect(r.firstMonthInterestCents).toBe(30_000n);
  });

  it("pagamento que cobre o juro quita e acumula juro a mais", () => {
    // Fatura R$1.000, paga R$1.000/mês, juro 15%.
    // m1: juro 150, saldo+juro 1150, paga 1000, saldo 150.
    // m2: juro 22,50, saldo+juro 172,50, paga 172,50, saldo 0.
    const r = RevolvingCreditSimulatorService.simulate({
      statementCents: 100_000n,
      monthlyPaymentCents: 100_000n,
      monthlyRate: 0.15,
    });
    expect(r.paysOff).toBe(true);
    expect(r.payoffMonth).toBe(2);
    expect(r.totalInterestCents).toBe(17_250n);
    expect(r.totalPaidCents).toBe(117_250n);
  });

  it("pagar a fatura inteira de uma vez: quita no mês 1, juro só do primeiro mês", () => {
    const r = RevolvingCreditSimulatorService.simulate({
      statementCents: 100_000n,
      monthlyPaymentCents: 1_000_000n,
      monthlyRate: 0.1,
    });
    expect(r.paysOff).toBe(true);
    expect(r.payoffMonth).toBe(1);
    expect(r.totalInterestCents).toBe(10_000n);
    expect(r.totalPaidCents).toBe(110_000n);
  });

  it("juro zero: quita pela divisão simples do pagamento", () => {
    const r = RevolvingCreditSimulatorService.simulate({
      statementCents: 100_000n,
      monthlyPaymentCents: 50_000n,
      monthlyRate: 0,
    });
    expect(r.paysOff).toBe(true);
    expect(r.payoffMonth).toBe(2);
    expect(r.totalInterestCents).toBe(0n);
  });

  it("pagamento zero nunca quita", () => {
    const r = RevolvingCreditSimulatorService.simulate({
      statementCents: 100_000n,
      monthlyPaymentCents: 0n,
      monthlyRate: 0.15,
    });
    expect(r.paysOff).toBe(false);
  });
});
