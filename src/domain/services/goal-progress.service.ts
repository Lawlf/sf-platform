import type { GoalEntity } from "@/domain/entities/goal.entity";

import { EmergencyFundService } from "./emergency-fund.service";
import { FinancialIndependenceService } from "./financial-independence.service";

export interface GoalMacroDebt {
  id: string;
  originalPrincipalCents: bigint;
  currentBalanceCents: bigint;
  monthlyPaymentCents: bigint;
  annualRatePct: number;
}

export interface GoalMacro {
  investedCents: bigint;
  cashReserveCents: bigint;
  contributionCents: bigint;
  monthlyServiceCents: bigint;
  monthlyIncomeCents: bigint;
  debts: GoalMacroDebt[];
}

export interface GoalProgress {
  currentCents: bigint;
  targetCents: bigint;
  pct: number;
  reached: boolean;
  etaMonths: number | null;
  needsAttention: boolean;
}

const MAX_MONTHS = 1200;
const DEFAULT_SAVINGS_RATE_PCT = 8;

// Custo de vida estimado quando o usuario nao informou um custo: 75% da renda
// mensal (a reserva cobre o custo de vida, nao a renda bruta). Bigint exato: x3/4.
const RESERVE_COST_NUM = 3n;
const RESERVE_COST_DEN = 4n;

export class GoalProgressService {
  static compute(goal: GoalEntity, macro: GoalMacro): GoalProgress {
    switch (goal.type) {
      case "debt_payoff":
        return debtPayoff(goal, macro);
      case "emergency_fund":
        return emergencyFund(goal, macro);
      case "savings":
        return savings(goal, macro);
      case "financial_independence":
        return financialIndependence(goal, macro);
    }
  }
}

function pctOf(current: bigint, target: bigint): number {
  if (target <= 0n) return current > 0n ? 100 : 0;
  const p = (Number(current) / Number(target)) * 100;
  return Math.max(0, Math.min(100, p));
}

function debtPayoff(goal: GoalEntity, macro: GoalMacro): GoalProgress {
  const debt = macro.debts.find((d) => d.id === goal.linkedDebtId);
  if (!debt) return attention();
  const paid = debt.originalPrincipalCents - debt.currentBalanceCents;
  const current = paid > 0n ? paid : 0n;
  const target = debt.originalPrincipalCents;
  const reached = debt.currentBalanceCents <= 0n;
  // Ritmo escolhido pela pessoa (ex: vindo do simulador de rotativo) manda na
  // ETA. Sem ritmo, cai no pagamento mensal padrão da dívida.
  const paced =
    goal.monthlyCostCents && goal.monthlyCostCents > 0n
      ? { ...debt, monthlyPaymentCents: goal.monthlyCostCents }
      : debt;
  const etaMonths = reached ? 0 : monthsToPayoff(paced);
  return { currentCents: current, targetCents: target, pct: pctOf(current, target), reached, etaMonths, needsAttention: false };
}

function emergencyFund(goal: GoalEntity, macro: GoalMacro): GoalProgress {
  const months = goal.targetMonths ?? 6;
  const monthlyCostCents =
    goal.monthlyCostCents ?? (macro.monthlyIncomeCents * RESERVE_COST_NUM) / RESERVE_COST_DEN;
  const r = EmergencyFundService.simulate({
    monthlyCostCents,
    currentReserveCents: macro.cashReserveCents,
    targetMonths: months,
    monthlyContributionCents: macro.contributionCents,
  });
  return {
    currentCents: macro.cashReserveCents, targetCents: r.targetCents,
    pct: pctOf(macro.cashReserveCents, r.targetCents),
    reached: r.status === "ok", etaMonths: r.monthsToComplete, needsAttention: false,
  };
}

function savings(goal: GoalEntity, macro: GoalMacro): GoalProgress {
  const target = goal.targetCents ?? 0n;
  const current = goal.manualSavedCents ?? 0n;
  const reached = target > 0n && current >= target;
  const etaMonths = reached ? 0 : monthsToReachTarget(current, macro.contributionCents, target, DEFAULT_SAVINGS_RATE_PCT);
  return { currentCents: current, targetCents: target, pct: pctOf(current, target), reached, etaMonths, needsAttention: false };
}

function financialIndependence(goal: GoalEntity, macro: GoalMacro): GoalProgress {
  const r = FinancialIndependenceService.simulate({
    currentInvestedCents: macro.investedCents,
    monthlyContributionCents: macro.contributionCents,
    monthlyCostOfLivingCents: goal.monthlyCostCents ?? 0n,
    realAnnualReturnPct: goal.realReturnPct ?? 4,
  });
  return {
    currentCents: macro.investedCents, targetCents: r.targetCents,
    pct: pctOf(macro.investedCents, r.targetCents),
    reached: r.alreadyFree, etaMonths: r.monthsToFreedom, needsAttention: false,
  };
}

export function monthsToReachTarget(currentCents: bigint, contributionCents: bigint, targetCents: bigint, annualRatePct: number): number | null {
  const target = Number(targetCents) / 100;
  let balance = Number(currentCents) / 100;
  const contribution = Number(contributionCents) / 100;
  if (balance >= target) return 0;
  const i = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    balance = balance * (1 + i) + contribution;
    if (balance >= target) return m;
  }
  return null;
}

function monthsToPayoff(debt: GoalMacroDebt): number | null {
  const i = Math.pow(1 + debt.annualRatePct / 100, 1 / 12) - 1;
  let balance = Number(debt.currentBalanceCents) / 100;
  const pay = Number(debt.monthlyPaymentCents) / 100;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    const interest = balance * i;
    balance = balance + interest - pay;
    if (balance <= 0) return m;
    if (pay <= interest) return null;
  }
  return null;
}

function attention(): GoalProgress {
  return { currentCents: 0n, targetCents: 0n, pct: 0, reached: false, etaMonths: null, needsAttention: true };
}
