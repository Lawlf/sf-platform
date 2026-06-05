import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type {
  DebtEntity,
  ExpenseCategory,
  FinancingDebt,
  RecurringDebt,
  RecurringFrequency,
} from "@/domain/entities/debt.entity";
import type { IncomeEntity, IncomeFrequency } from "@/domain/entities/income.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { isOk } from "@/shared/errors/result";

import { TimelineService } from "./timeline.service";

function rateAnnual(value: number): InterestRate {
  const r = InterestRate.fromAnnual(value);
  if (!isOk(r)) throw new Error("rate setup failed");
  return r.value;
}

function makeIncome(overrides: {
  id?: string;
  amountCents: bigint;
  frequency?: IncomeFrequency;
  startDate?: Date;
  endDate?: Date | null;
  isActive?: boolean;
  createdAt?: Date;
}): IncomeEntity {
  const startDate = overrides.startDate ?? new Date(Date.UTC(2026, 0, 1));
  return {
    id: overrides.id ?? "inc-1",
    userId: "user-1",
    label: "Renda",
    amount: Money.fromCents(overrides.amountCents),
    frequency: overrides.frequency ?? "monthly",
    startDate,
    endDate: overrides.endDate ?? null,
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? startDate,
    deletedAt: null,
  };
}

function makeAsset(overrides: {
  id?: string;
  currentValueCents: bigint;
  createdAt?: Date;
  deactivatedAt?: Date | null;
}): AssetEntity {
  return {
    id: overrides.id ?? "asset-1",
    userId: "user-1",
    category: "vehicle",
    label: "Carro",
    currentValue: Money.fromCents(overrides.currentValueCents),
    metadata: null,
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: overrides.createdAt ?? new Date(Date.UTC(2026, 0, 1)),
    updatedAt: new Date(Date.UTC(2026, 0, 1)),
    deactivatedAt: overrides.deactivatedAt ?? null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
  };
}

function makeFinancing(overrides: {
  id?: string;
  originalPrincipalCents?: bigint;
  currentBalanceCents: bigint;
  createdAt?: Date;
}): FinancingDebt {
  return {
    id: overrides.id ?? "debt-1",
    userId: "user-1",
    kind: "financing",
    label: "Financiamento",
    status: "active",
    originalPrincipal: Money.fromCents(overrides.originalPrincipalCents ?? 10_000_000n),
    currentBalance: Money.fromCents(overrides.currentBalanceCents),
    startDate: new Date(Date.UTC(2026, 0, 1)),
    expectedEndDate: null,
    notes: null,
    amortizationMethod: "PRICE",
    annualInterestRate: rateAnnual(0.1),
    termMonths: 360,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    createdAt: overrides.createdAt ?? new Date(Date.UTC(2026, 0, 1)),
    updatedAt: new Date(Date.UTC(2026, 0, 1)),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makeRecurring(overrides: {
  id?: string;
  amountCents: bigint;
  frequency?: RecurringFrequency;
  category?: ExpenseCategory;
  startDate?: Date;
  expectedEndDate?: Date | null;
  status?: "active" | "paid_off" | "written_off";
}): RecurringDebt {
  return {
    id: overrides.id ?? "rec-1",
    userId: "user-1",
    kind: "recurring",
    label: "Aluguel",
    status: overrides.status ?? "active",
    originalPrincipal: Money.fromCents(0n),
    currentBalance: Money.fromCents(0n),
    startDate: overrides.startDate ?? new Date(Date.UTC(2026, 0, 1)),
    expectedEndDate: overrides.expectedEndDate ?? null,
    notes: null,
    createdAt: overrides.startDate ?? new Date(Date.UTC(2026, 0, 1)),
    updatedAt: new Date(Date.UTC(2026, 0, 1)),
    deletedAt: null,
    recurringFrequency: overrides.frequency ?? "monthly",
    recurringAmountCents: overrides.amountCents,
    expenseCategory: overrides.category ?? "housing",
    dueDay: null,
  };
}

function makePayment(overrides: {
  id?: string;
  debtId?: string;
  paidAt: Date;
  amountCents: bigint;
}): DebtPaymentEntity {
  return {
    id: overrides.id ?? "pay-1",
    debtId: overrides.debtId ?? "debt-1",
    paidAt: overrides.paidAt,
    amount: Money.fromCents(overrides.amountCents),
    principalPortion: Money.fromCents(overrides.amountCents),
    interestPortion: Money.fromCents(0n),
    isExtra: false,
    isClosingPayment: false,
  };
}

describe("TimelineService.buildTimeline", () => {
  it("entrada vazia: cada ponto tem todos os Money zero", () => {
    const from = MonthYear.from(2026, 1);
    const to = MonthYear.from(2026, 3);
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [],
      payments: [],
      assets: [],
      from,
      to,
    });
    expect(tl.points).toHaveLength(3);
    for (const p of tl.points) {
      expect(p.totalIncome.toCents()).toBe(0n);
      expect(p.totalDebtPayments.toCents()).toBe(0n);
      expect(p.freeBalance.toCents()).toBe(0n);
      expect(p.netWorth.toCents()).toBe(0n);
      expect(p.assetsTotal.toCents()).toBe(0n);
      expect(p.debtsBalance.toCents()).toBe(0n);
    }
  });

  it("renda mensal de R$5000: todo ponto no intervalo tem totalIncome = 5000", () => {
    const from = MonthYear.from(2026, 1);
    const to = MonthYear.from(2026, 6);
    const income = makeIncome({
      amountCents: 500_000n, // R$ 5.000,00
      frequency: "monthly",
      startDate: new Date(Date.UTC(2025, 11, 1)), // dezembro/2025 (antes do range)
    });
    const tl = TimelineService.buildTimeline({
      incomes: [income],
      debts: [],
      payments: [],
      assets: [],
      from,
      to,
    });
    expect(tl.points).toHaveLength(6);
    for (const p of tl.points) {
      expect(p.totalIncome.toCents()).toBe(500_000n);
    }
  });

  it("renda semanal de R$1000: totalIncome ~= R$ 4.330,00 (4.33 semanas/mês)", () => {
    const income = makeIncome({
      amountCents: 100_000n, // R$ 1.000,00
      frequency: "weekly",
    });
    const tl = TimelineService.buildTimeline({
      incomes: [income],
      debts: [],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 5),
    });
    expect(tl.points).toHaveLength(1);
    // 100_000 * 4.33 = 433_000
    expect(tl.points[0]?.totalIncome.toCents()).toBe(433_000n);
  });

  it("renda one_off: aparece apenas no mês de startDate", () => {
    const income = makeIncome({
      amountCents: 200_000n,
      frequency: "one_off",
      startDate: new Date(Date.UTC(2026, 3, 10)), // abril/2026
    });
    const tl = TimelineService.buildTimeline({
      incomes: [income],
      debts: [],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 3),
      to: MonthYear.from(2026, 6),
    });
    const cents = tl.points.map((p) => p.totalIncome.toCents());
    expect(cents).toEqual([0n, 200_000n, 0n, 0n]);
  });

  it("pagamento único: apenas o mês em questão tem totalDebtPayments > 0", () => {
    const debt = makeFinancing({ currentBalanceCents: 1_000_000n });
    const payment = makePayment({
      paidAt: new Date(Date.UTC(2026, 4, 15)), // maio/2026
      amountCents: 50_000n,
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [debt],
      payments: [payment],
      assets: [],
      from: MonthYear.from(2026, 4),
      to: MonthYear.from(2026, 6),
    });
    const cents = tl.points.map((p) => p.totalDebtPayments.toCents());
    expect(cents).toEqual([0n, 50_000n, 0n]);
  });

  it("dois pagamentos no mesmo mês são somados", () => {
    const debt = makeFinancing({ currentBalanceCents: 1_000_000n });
    const p1 = makePayment({
      id: "pay-1",
      paidAt: new Date(Date.UTC(2026, 4, 5)),
      amountCents: 30_000n,
    });
    const p2 = makePayment({
      id: "pay-2",
      paidAt: new Date(Date.UTC(2026, 4, 20)),
      amountCents: 70_000n,
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [debt],
      payments: [p1, p2],
      assets: [],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 5),
    });
    expect(tl.points[0]?.totalDebtPayments.toCents()).toBe(100_000n);
  });

  it("freeBalance = renda - pagamentos (positivo e negativo)", () => {
    const income = makeIncome({ amountCents: 500_000n, frequency: "monthly" });
    const debt = makeFinancing({ currentBalanceCents: 1_000_000n });
    const heavyPayment = makePayment({
      paidAt: new Date(Date.UTC(2026, 4, 15)),
      amountCents: 800_000n,
    });
    const lightPayment = makePayment({
      id: "pay-2",
      paidAt: new Date(Date.UTC(2026, 5, 15)),
      amountCents: 200_000n,
    });
    const tl = TimelineService.buildTimeline({
      incomes: [income],
      debts: [debt],
      payments: [heavyPayment, lightPayment],
      assets: [],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 6),
    });
    // maio: 5000 - 8000 = -3000
    expect(tl.points[0]?.freeBalance.toCents()).toBe(-300_000n);
    expect(tl.points[0]?.freeBalance.isNegative()).toBe(true);
    // junho: 5000 - 2000 = 3000
    expect(tl.points[1]?.freeBalance.toCents()).toBe(300_000n);
  });

  it("ativo criado em janeiro só aparece a partir de janeiro", () => {
    const asset = makeAsset({
      currentValueCents: 3_000_000n,
      createdAt: new Date(Date.UTC(2026, 0, 10)), // jan/2026
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [],
      payments: [],
      assets: [asset],
      from: MonthYear.from(2025, 11),
      to: MonthYear.from(2026, 2),
    });
    const cents = tl.points.map((p) => p.assetsTotal.toCents());
    // nov/2025: 0, dez/2025: 0, jan/2026: 3M, fev/2026: 3M
    expect(cents).toEqual([0n, 0n, 3_000_000n, 3_000_000n]);
  });

  it("ativo desativado é excluído do assetsTotal", () => {
    const live = makeAsset({
      id: "a-live",
      currentValueCents: 2_000_000n,
      createdAt: new Date(Date.UTC(2026, 0, 1)),
    });
    const dead = makeAsset({
      id: "a-dead",
      currentValueCents: 1_000_000n,
      createdAt: new Date(Date.UTC(2026, 0, 1)),
      deactivatedAt: new Date(Date.UTC(2026, 0, 1)),
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [],
      payments: [],
      assets: [live, dead],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 5),
    });
    expect(tl.points[0]?.assetsTotal.toCents()).toBe(2_000_000n);
  });

  it("debtsBalance estima saldo passado somando pagamentos futuros ao currentBalance", () => {
    // Hoje saldo = R$ 1.000.000. Houve pagamento de R$ 500.000 em jun/2026.
    // Para mai/2026 (antes do pagamento), saldo estimado = 1.000.000 + 500.000 = 1.500.000.
    // Para jul/2026 (após o pagamento), saldo estimado = 1.000.000.
    const debt = makeFinancing({
      currentBalanceCents: 1_000_000n,
      createdAt: new Date(Date.UTC(2025, 0, 1)),
    });
    const payment = makePayment({
      paidAt: new Date(Date.UTC(2026, 5, 15)),
      amountCents: 500_000n,
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [debt],
      payments: [payment],
      assets: [],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 7),
    });
    const cents = tl.points.map((p) => p.debtsBalance.toCents());
    expect(cents).toEqual([1_500_000n, 1_000_000n, 1_000_000n]);
  });

  it("múltiplas dívidas: debtsBalance soma estimativas individualmente", () => {
    const d1 = makeFinancing({
      id: "d1",
      currentBalanceCents: 1_000_000n,
      createdAt: new Date(Date.UTC(2025, 0, 1)),
    });
    const d2 = makeFinancing({
      id: "d2",
      currentBalanceCents: 500_000n,
      createdAt: new Date(Date.UTC(2025, 0, 1)),
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [d1, d2],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 5),
    });
    expect(tl.points[0]?.debtsBalance.toCents()).toBe(1_500_000n);
  });

  it("intervalo from/to: pontos em ordem cronológica e contagem correta", () => {
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 1),
      to: MonthYear.from(2026, 12),
    });
    expect(tl.points).toHaveLength(12);
    for (let i = 0; i < tl.points.length; i++) {
      expect(tl.points[i]?.month.month).toBe(i + 1);
      expect(tl.points[i]?.month.year).toBe(2026);
    }
  });

  it("intervalo cruzando ano: dez/2025 -> fev/2026 dá 3 pontos", () => {
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [],
      payments: [],
      assets: [],
      from: MonthYear.from(2025, 12),
      to: MonthYear.from(2026, 2),
    });
    expect(tl.points).toHaveLength(3);
    expect(tl.points[0]?.month.toIso()).toBe("2025-12");
    expect(tl.points[1]?.month.toIso()).toBe("2026-01");
    expect(tl.points[2]?.month.toIso()).toBe("2026-02");
  });

  it("renda com endDate: aparece antes do fim, zera depois", () => {
    const income = makeIncome({
      amountCents: 500_000n,
      frequency: "monthly",
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2026, 4, 31)), // termina em mai/2026
    });
    const tl = TimelineService.buildTimeline({
      incomes: [income],
      debts: [],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 4),
      to: MonthYear.from(2026, 7),
    });
    const cents = tl.points.map((p) => p.totalIncome.toCents());
    expect(cents).toEqual([500_000n, 500_000n, 0n, 0n]);
  });

  it("netWorth = assetsTotal - debtsBalance (pode ser negativo)", () => {
    const asset = makeAsset({
      currentValueCents: 1_000_000n,
      createdAt: new Date(Date.UTC(2026, 0, 1)),
    });
    const debt = makeFinancing({
      currentBalanceCents: 3_000_000n,
      createdAt: new Date(Date.UTC(2026, 0, 1)),
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [debt],
      payments: [],
      assets: [asset],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 5),
    });
    expect(tl.points[0]?.netWorth.toCents()).toBe(-2_000_000n);
    expect(tl.points[0]?.netWorth.isNegative()).toBe(true);
  });

  it("compromisso recurring mensal de R$1000: cada ponto tem totalDebtPayments = 1000", () => {
    const rec = makeRecurring({
      amountCents: 100_000n,
      frequency: "monthly",
      startDate: new Date(Date.UTC(2025, 11, 1)),
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [rec],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 1),
      to: MonthYear.from(2026, 4),
    });
    expect(tl.points).toHaveLength(4);
    for (const p of tl.points) {
      expect(p.totalDebtPayments.toCents()).toBe(100_000n);
    }
  });

  it("compromisso recurring semanal de R$200: totalDebtPayments ~= R$ 866 (4.33 semanas/mês)", () => {
    const rec = makeRecurring({
      amountCents: 20_000n,
      frequency: "weekly",
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [rec],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 5),
    });
    // 20_000 * 4.33 = 86_600
    expect(tl.points[0]?.totalDebtPayments.toCents()).toBe(86_600n);
  });

  it("freeBalance combina pagamentos de parcela + outflow recorrente", () => {
    const income = makeIncome({ amountCents: 500_000n, frequency: "monthly" });
    const debt = makeFinancing({ currentBalanceCents: 1_000_000n });
    const payment = makePayment({
      paidAt: new Date(Date.UTC(2026, 4, 15)),
      amountCents: 100_000n,
    });
    const rec = makeRecurring({
      amountCents: 150_000n,
      frequency: "monthly",
      startDate: new Date(Date.UTC(2025, 11, 1)),
    });
    const tl = TimelineService.buildTimeline({
      incomes: [income],
      debts: [debt, rec],
      payments: [payment],
      assets: [],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 5),
    });
    // 5000 - 1000 (parcela) - 1500 (recurring) = 2500
    expect(tl.points[0]?.totalIncome.toCents()).toBe(500_000n);
    expect(tl.points[0]?.totalDebtPayments.toCents()).toBe(250_000n);
    expect(tl.points[0]?.freeBalance.toCents()).toBe(250_000n);
  });

  it("recurring com expectedEndDate: aparece antes do fim, zera depois", () => {
    const rec = makeRecurring({
      amountCents: 80_000n,
      frequency: "monthly",
      startDate: new Date(Date.UTC(2026, 0, 1)),
      expectedEndDate: new Date(Date.UTC(2026, 4, 31)), // termina em mai/2026
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [rec],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 4),
      to: MonthYear.from(2026, 7),
    });
    const cents = tl.points.map((p) => p.totalDebtPayments.toCents());
    expect(cents).toEqual([80_000n, 80_000n, 0n, 0n]);
  });
});

describe("TimelineService casos extremos", () => {
  it("from == to: produz exatamente 1 ponto", () => {
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 5),
      to: MonthYear.from(2026, 5),
    });
    expect(tl.points).toHaveLength(1);
    expect(tl.points[0]?.month.toIso()).toBe("2026-05");
  });

  it("dívida criada depois do mês alvo: não soma em debtsBalance", () => {
    const debt = makeFinancing({
      currentBalanceCents: 1_000_000n,
      createdAt: new Date(Date.UTC(2026, 5, 1)), // jun/2026
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [debt as DebtEntity],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 4),
      to: MonthYear.from(2026, 6),
    });
    const cents = tl.points.map((p) => p.debtsBalance.toCents());
    expect(cents).toEqual([0n, 0n, 1_000_000n]);
  });
});

describe("TimelineService.buildTimeline com settlements (anti double-count)", () => {
  it("recorrente convertido em dívida no mês M: não soma como saída naquele mês", () => {
    const income = makeIncome({ amountCents: 500_000n, frequency: "monthly" });
    const rec = makeRecurring({
      id: "rent-1",
      amountCents: 150_000n,
      frequency: "monthly",
    });
    const tl = TimelineService.buildTimeline({
      incomes: [income],
      debts: [rec as DebtEntity],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 3),
      to: MonthYear.from(2026, 3),
      settlements: [
        { debtId: "rent-1", monthIso: "2026-03", status: "converted_to_debt" },
      ],
    });
    expect(tl.points).toHaveLength(1);
    // Saída zerada no mês convertido => debtPayments 0, saldo livre = renda cheia.
    expect(tl.points[0]?.totalDebtPayments.toCents()).toBe(0n);
    expect(tl.points[0]?.freeBalance.toCents()).toBe(500_000n);
  });

  it("meses não-convertidos seguem somando a saída normalmente", () => {
    const rec = makeRecurring({
      id: "rent-1",
      amountCents: 150_000n,
      frequency: "monthly",
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [rec as DebtEntity],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 3),
      to: MonthYear.from(2026, 5),
      settlements: [
        { debtId: "rent-1", monthIso: "2026-04", status: "converted_to_debt" },
      ],
    });
    const cents = tl.points.map((p) => p.totalDebtPayments.toCents());
    // mar normal, abr zerado (convertido), mai normal.
    expect(cents).toEqual([150_000n, 0n, 150_000n]);
  });

  it("settlement cancelled não zera a saída (só converted_to_debt zera)", () => {
    const rec = makeRecurring({
      id: "rent-1",
      amountCents: 150_000n,
      frequency: "monthly",
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [rec as DebtEntity],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 3),
      to: MonthYear.from(2026, 3),
      settlements: [{ debtId: "rent-1", monthIso: "2026-03", status: "cancelled" }],
    });
    expect(tl.points[0]?.totalDebtPayments.toCents()).toBe(150_000n);
  });

  it("settlement de outro debtId não afeta este compromisso", () => {
    const rec = makeRecurring({
      id: "rent-1",
      amountCents: 150_000n,
      frequency: "monthly",
    });
    const tl = TimelineService.buildTimeline({
      incomes: [],
      debts: [rec as DebtEntity],
      payments: [],
      assets: [],
      from: MonthYear.from(2026, 3),
      to: MonthYear.from(2026, 3),
      settlements: [
        { debtId: "other-debt", monthIso: "2026-03", status: "converted_to_debt" },
      ],
    });
    expect(tl.points[0]?.totalDebtPayments.toCents()).toBe(150_000n);
  });
});
