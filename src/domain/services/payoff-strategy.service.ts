import type { DebtEntity } from "@/domain/entities/debt.entity";
import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import { Money } from "@/domain/value-objects/money.vo";
import { err, isOk, ok, type Result } from "@/shared/errors/result";

import { PriceAmortizationService } from "./amortization/price-amortization.service";
import { SacAmortizationService } from "./amortization/sac-amortization.service";

const DEFAULT_MAX_MONTHS = 600;
const HARD_CAP_MONTHS = 600;
const CREDIT_CARD_MIN_FRACTION = 0.15;

export interface PayoffPlan {
  order: string[];
  monthsToFreedom: number | null;
  totalInterest: Money;
  totalPaid: Money;
}

export interface PayoffComparison {
  snowball: PayoffPlan;
  avalanche: PayoffPlan;
}

export interface PayoffStrategyInput {
  debts: DebtEntity[];
  monthlyBudget: Money;
  startingFrom: Date;
  maxMonths?: number;
}

interface DebtMinimum {
  value: number;
  monthlyRate: number;
}

interface SimDebt {
  id: string;
  balance: number;
  monthlyRate: number;
  minimumPayment: number;
  priorityKey: number;
}

interface SimResult {
  monthsToFreedom: number | null;
  totalInterest: number;
  totalPaid: number;
  order: string[];
}

export class PayoffStrategyService {
  static compare(
    input: PayoffStrategyInput,
  ): Result<PayoffComparison, InvalidAmortizationParamsError> {
    if (input.debts.length === 0) {
      return err(new InvalidAmortizationParamsError("Lista de dívidas vazia."));
    }
    if (!input.monthlyBudget.isPositive() && !input.monthlyBudget.isZero()) {
      return err(new InvalidAmortizationParamsError("Orçamento mensal não pode ser negativo."));
    }

    const cap = Math.min(input.maxMonths ?? DEFAULT_MAX_MONTHS, HARD_CAP_MONTHS);
    if (!Number.isInteger(cap) || cap < 1) {
      return err(new InvalidAmortizationParamsError("maxMonths deve ser inteiro >= 1."));
    }

    const minimums: { debt: DebtEntity; min: DebtMinimum }[] = [];
    let sumMinimums = 0;
    for (const debt of input.debts) {
      const r = minimumFor(debt);
      if (!isOk(r)) return err(r.error);
      minimums.push({ debt, min: r.value });
      sumMinimums += r.value.value;
    }

    const budget = input.monthlyBudget.toNumber();
    if (sumMinimums - budget > 1e-9) {
      return err(
        new InvalidAmortizationParamsError(
          "Orcamento mensal e insuficiente para cobrir os pagamentos minimos.",
        ),
      );
    }

    const snowball = buildAndSimulate(minimums, "snowball", budget, cap);
    if (!isOk(snowball)) return err(snowball.error);
    const avalanche = buildAndSimulate(minimums, "avalanche", budget, cap);
    if (!isOk(avalanche)) return err(avalanche.error);

    return ok({ snowball: snowball.value, avalanche: avalanche.value });
  }
}

function buildAndSimulate(
  minimums: { debt: DebtEntity; min: DebtMinimum }[],
  strategy: "snowball" | "avalanche",
  budget: number,
  maxMonths: number,
): Result<PayoffPlan, InvalidAmortizationParamsError> {
  const simDebts: SimDebt[] = minimums.map(({ debt, min }) => ({
    id: debt.id,
    balance: debt.currentBalance.toNumber(),
    monthlyRate: min.monthlyRate,
    minimumPayment: min.value,
    priorityKey: strategy === "snowball" ? debt.currentBalance.toNumber() : -min.monthlyRate,
  }));

  const sim = simulate(simDebts, budget, maxMonths);

  const totalInterest = Money.from(sim.totalInterest);
  const totalPaid = Money.from(sim.totalPaid);
  if (!isOk(totalInterest) || !isOk(totalPaid)) {
    return err(new InvalidAmortizationParamsError("Falha ao formatar totais do plano."));
  }
  return ok({
    order: sim.order,
    monthsToFreedom: sim.monthsToFreedom,
    totalInterest: totalInterest.value,
    totalPaid: totalPaid.value,
  });
}

function simulate(debts: SimDebt[], budget: number, maxMonths: number): SimResult {
  const sorted = [...debts].sort((a, b) => a.priorityKey - b.priorityKey);
  const order = sorted.map((d) => d.id);
  const active = sorted.map((d) => ({ ...d }));

  let totalInterest = 0;
  let totalPaid = 0;

  for (let month = 1; month <= maxMonths; month++) {
    if (active.every((d) => d.balance <= 0)) {
      return { monthsToFreedom: month - 1, totalInterest, totalPaid, order };
    }
    // Accrue interest first
    for (const d of active) {
      if (d.balance > 0) {
        const interest = d.balance * d.monthlyRate;
        d.balance += interest;
        totalInterest += interest;
      }
    }
    // Pay minimums to all active
    let leftover = budget;
    for (const d of active) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minimumPayment, d.balance);
      d.balance -= pay;
      leftover -= pay;
      totalPaid += pay;
    }
    if (leftover < -1e-9) {
      return { monthsToFreedom: null, totalInterest, totalPaid, order };
    }
    // Apply leftover to priority list
    for (const d of active) {
      if (leftover <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(leftover, d.balance);
      d.balance -= pay;
      leftover -= pay;
      totalPaid += pay;
    }
  }

  if (active.every((d) => d.balance <= 0)) {
    return { monthsToFreedom: maxMonths, totalInterest, totalPaid, order };
  }
  return { monthsToFreedom: null, totalInterest, totalPaid, order };
}

function minimumFor(debt: DebtEntity): Result<DebtMinimum, InvalidAmortizationParamsError> {
  switch (debt.kind) {
    case "financing": {
      const svc =
        debt.amortizationMethod === "PRICE" ? PriceAmortizationService : SacAmortizationService;
      const s = svc.generate({
        principal: debt.originalPrincipal,
        annualRate: debt.annualInterestRate,
        termMonths: debt.termMonths,
      });
      if (!isOk(s)) return err(s.error);
      const first = s.value.installmentAt(1);
      if (!first) {
        return err(new InvalidAmortizationParamsError("Sem parcela inicial para financiamento."));
      }
      return ok({
        value: first.installment.toNumber(),
        monthlyRate: debt.annualInterestRate.toMonthly().toDecimal(),
      });
    }
    case "personal_loan":
      return ok({
        value: debt.monthlyInstallment.toNumber(),
        monthlyRate: debt.annualInterestRate.toMonthly().toDecimal(),
      });
    case "credit_card": {
      const stmt = debt.currentStatement.toNumber();
      const monthlyRate = debt.revolvingMonthlyRate?.toDecimal() ?? 0;
      const minimum =
        stmt > 0
          ? stmt * CREDIT_CARD_MIN_FRACTION
          : Math.max(0, debt.currentBalance.toNumber() * monthlyRate);
      return ok({ value: minimum, monthlyRate });
    }
    case "overdraft":
      return ok({
        value: debt.currentBalance.toNumber() * debt.monthlyRate.toDecimal(),
        monthlyRate: debt.monthlyRate.toDecimal(),
      });
    case "recurring":
      // Compromissos recorrentes não entram no jogo de payoff
      // (não acumulam juros, não têm saldo a quitar). Mínimo zero, taxa zero.
      return ok({ value: 0, monthlyRate: 0 });
  }
}
