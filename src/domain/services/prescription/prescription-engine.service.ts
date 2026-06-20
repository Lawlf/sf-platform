import type { DebtEntity } from "@/domain/entities/debt.entity";
import { DebtPayoffProjectorService } from "@/domain/services/debt-payoff-projector.service";
import { monthlyMinimumPayment, monthlyRateFor } from "@/domain/services/financial-health.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { DebtCascadeProjectorService } from "./debt-cascade-projector.service";
import type {
  CascadeSegment,
  MissingInput,
  Prescription,
  PrescriptionMove,
  PrescriptionSnapshot,
} from "./prescription.types";

export class PrescriptionEngine {
  static prescribe(snapshot: PrescriptionSnapshot): Prescription {
    const missing = detectMissing(snapshot);
    if (missing.length > 0) {
      return {
        state: "incomplete",
        committedPct: snapshot.committedPct,
        freeBalanceReais: snapshot.freeBalanceReais,
        hasEstimatedIncome: snapshot.hasEstimatedIncome,
        dominant: null,
        alternatives: [],
        timeline: [],
        completeness: { complete: false, missing },
      };
    }
    const { debts, estimatedRateIds } = applyRateEstimates(snapshot.debts, snapshot.config);
    const s: PrescriptionSnapshot = { ...snapshot, debts };
    const state = classify(s);
    const dominant = buildDominant(state, s, estimatedRateIds);
    const alternatives = buildAlternatives(state, s, dominant, estimatedRateIds);
    const timeline = buildTimeline(state, s);
    return {
      state,
      committedPct: s.committedPct,
      freeBalanceReais: s.freeBalanceReais,
      hasEstimatedIncome: s.hasEstimatedIncome,
      dominant,
      alternatives,
      timeline,
      completeness: { complete: true, missing: [] },
    };
  }
}

// Timeline só se qualifica quando há cascata real: estado bleeding (dominante =
// pagar dívida), sobra positiva pra rolar entre dívidas, e pelo menos uma
// quitação dentro do horizonte. Só-corte-no-horizonte não conta. Fora disso a
// UI cai no "Depois dessa".
function buildTimeline(state: CompleteState, s: PrescriptionSnapshot): CascadeSegment[] {
  if (state !== "bleeding" || s.freeBalanceReais <= 0) return [];
  const segments = DebtCascadeProjectorService.project({
    debts: expensiveDebts(s),
    monthlyFreeBalance: s.freeBalanceReais,
    startingFrom: s.now,
    horizonMonths: s.config.timelineHorizonMonths,
  });
  return segments.some((seg) => seg.kind === "debt") ? segments : [];
}

function detectMissing(s: PrescriptionSnapshot): MissingInput[] {
  const missing: MissingInput[] = [];
  if (s.monthlyIncomeReais <= 0) missing.push("income");
  return missing;
}

// Rotativo sem taxa cadastrada não trava a prescrição: usa a estimativa de
// mercado pra ranquear/projetar e marca o move como estimado. Devolve os debts
// normalizados + os ids que caíram na estimativa.
function applyRateEstimates(
  debts: DebtEntity[],
  config: PrescriptionSnapshot["config"],
): { debts: DebtEntity[]; estimatedRateIds: Set<string> } {
  const estimatedRateIds = new Set<string>();
  const out = debts.map((d) => {
    if (d.kind === "credit_card" && d.revolvingMonthlyRate === null && d.currentBalance.toNumber() > 0) {
      const r = InterestRate.fromMonthly(config.creditCardFallbackMonthlyRate);
      if (isOk(r)) {
        estimatedRateIds.add(d.id);
        return { ...d, revolvingMonthlyRate: r.value };
      }
    }
    return d;
  });
  return { debts: out, estimatedRateIds };
}

type CompleteState = "tight" | "bleeding" | "no_cushion" | "ready_to_grow";

function classify(s: PrescriptionSnapshot): CompleteState {
  if (s.freeBalanceReais <= 0 || s.committedPct > s.config.committedHeavyPct) return "tight";
  const reserveFloor = s.monthlyEssentialReais * s.config.reserveFloorMonths;
  const minSafety = s.monthlyEssentialReais * s.config.minSafetyMonths;
  if (hasExpensiveDebt(s)) {
    if (s.reserveReais < minSafety) return "no_cushion";
    return "bleeding";
  }
  return s.reserveReais < reserveFloor ? "no_cushion" : "ready_to_grow";
}

export function hasExpensiveDebt(s: PrescriptionSnapshot): boolean {
  return expensiveDebts(s).length > 0;
}

export function expensiveDebts(s: PrescriptionSnapshot): DebtEntity[] {
  return s.debts
    .filter((d) => d.kind !== "recurring" && d.currentBalance.toNumber() > 0)
    .filter((d) => monthlyRateFor(d) > s.config.expensiveDebtMonthlyRate);
}

export function topExpensiveDebt(s: PrescriptionSnapshot): DebtEntity | null {
  const list = [...expensiveDebts(s)].sort((a, b) => monthlyRateFor(b) - monthlyRateFor(a));
  return list[0] ?? null;
}

function buildDominant(
  state: CompleteState,
  s: PrescriptionSnapshot,
  estimatedRateIds: Set<string>,
): PrescriptionMove {
  switch (state) {
    case "tight":
      return buildReduceCommitment(s);
    case "bleeding":
      return buildPayDebt(s, topExpensiveDebt(s)!, estimatedRateIds);
    case "no_cushion":
      return buildReserveMove(s);
    case "ready_to_grow":
      return s.hasEstimatedIncome ? buildKeepBuffer(s) : buildInvest(s);
  }
}

export function buildPayDebt(
  s: PrescriptionSnapshot,
  debt: DebtEntity,
  estimatedRateIds?: Set<string>,
): PrescriptionMove {
  const minR = monthlyMinimumPayment(debt);
  const minMoney = (() => {
    const v = isOk(minR) ? Math.max(0, minR.value) : 0;
    const m = Money.from(v);
    return isOk(m) ? m.value : Money.fromCents(0n);
  })();
  const extraMoney = (() => {
    const m = Money.from(Math.max(0, s.freeBalanceReais));
    return isOk(m) ? m.value : Money.fromCents(0n);
  })();
  const baseline = DebtPayoffProjectorService.project({
    debt, monthlyPayment: minMoney, startingFrom: s.now, maxMonths: s.config.maxPayoffMonths,
  });
  const withExtra = DebtPayoffProjectorService.project({
    debt, monthlyPayment: minMoney, extraPayment: extraMoney, startingFrom: s.now, maxMonths: s.config.maxPayoffMonths,
  });
  let monthsToPayoff: number | null = null;
  let baselineNeverPayoff = false;
  let rankImpactReais = 0;
  let displayMetrics: { interestSavedReais: number; monthsSaved: number } | undefined;

  if (isOk(baseline) && isOk(withExtra)) {
    monthsToPayoff = withExtra.value.payoffMonth;
    const rawInterestSaved = Math.max(
      0,
      baseline.value.totalInterest.toNumber() - withExtra.value.totalInterest.toNumber(),
    );
    rankImpactReais = rawInterestSaved; // ranking interno; não é exibido

    const baselinePaysOff =
      baseline.value.payoffMonth !== null && !baseline.value.negativeAmortization;
    if (baselinePaysOff) {
      const b = baseline.value.payoffMonth ?? s.config.maxPayoffMonths;
      const w = withExtra.value.payoffMonth ?? s.config.maxPayoffMonths;
      displayMetrics = { interestSavedReais: rawInterestSaved, monthsSaved: Math.max(0, b - w) };
    } else {
      // Pagando só o mínimo, a dívida nunca quitaria; juros "economizado" seria fictício.
      baselineNeverPayoff = true;
    }
  }

  const rateEstimated = estimatedRateIds?.has(debt.id) ?? false;
  return {
    type: "pay_debt",
    reasonCode: "highest_rate",
    targetDebtId: debt.id,
    targetDebtLabel: debt.label,
    metrics: {
      ...displayMetrics,
      monthsToPayoff,
      baselineNeverPayoff,
      ...(rateEstimated ? { rateEstimated: true } : {}),
    },
    rankImpactReais,
  };
}

function buildKeepBuffer(_s: PrescriptionSnapshot): PrescriptionMove {
  return {
    type: "build_reserve",
    reasonCode: "keep_buffer_estimated",
    metrics: {},
    rankImpactReais: 0,
  };
}

function buildReserveMove(s: PrescriptionSnapshot): PrescriptionMove {
  const minSafety = s.monthlyEssentialReais * s.config.minSafetyMonths;
  const floor = s.monthlyEssentialReais * s.config.reserveFloorMonths;
  const belowMinSafety = hasExpensiveDebt(s) && s.reserveReais < minSafety;
  const target = belowMinSafety ? minSafety : floor;
  const gap = Math.max(0, target - s.reserveReais);
  const monthly = Math.max(0, s.freeBalanceReais);
  const monthsToReserve = monthly > 0 ? Math.ceil(gap / monthly) : null;
  return {
    type: "build_reserve", reasonCode: belowMinSafety ? "below_min_safety" : "below_reserve_floor",
    metrics: { reserveGapReais: gap, monthsToReserve, monthlyContributionReais: Math.min(monthly, gap) },
    rankImpactReais: gap,
  };
}

function buildInvest(s: PrescriptionSnapshot): PrescriptionMove {
  const monthly = Math.max(0, s.freeBalanceReais);
  const monthlyRateDec = Math.pow(1 + s.config.investAnnualRate, 1 / 12) - 1;
  let balance = 0;
  for (let m = 0; m < 12; m++) balance = (balance + monthly) * (1 + monthlyRateDec);
  const contributed = monthly * 12;
  const growth = Math.max(0, balance - contributed);
  return {
    type: "invest", reasonCode: "no_expensive_debt_reserve_ok",
    metrics: { monthlyContributionReais: monthly, projectedGrowthReais: growth }, rankImpactReais: growth,
  };
}

function buildReduceCommitment(s: PrescriptionSnapshot): PrescriptionMove {
  const negative = s.freeBalanceReais < 0;
  const targetReduction = negative
    ? Math.abs(s.freeBalanceReais)
    : Math.max(0, ((s.committedPct - s.config.committedHeavyPct) / 100) * s.monthlyIncomeReais);
  return {
    type: "reduce_commitment", reasonCode: negative ? "negative_free_balance" : "income_over_committed",
    metrics: { targetReductionReais: targetReduction }, rankImpactReais: targetReduction,
  };
}

function buildAlternatives(
  state: CompleteState,
  s: PrescriptionSnapshot,
  dominant: PrescriptionMove,
  estimatedRateIds: Set<string>,
): PrescriptionMove[] {
  const candidates: PrescriptionMove[] = [];
  if (dominant.type === "pay_debt") {
    for (const debt of expensiveDebts(s)) {
      if (debt.id === dominant.targetDebtId) continue;
      candidates.push(buildPayDebt(s, debt, estimatedRateIds));
    }
  }
  if (dominant.type !== "build_reserve" && s.reserveReais < s.monthlyEssentialReais * s.config.reserveFloorMonths) {
    candidates.push(buildReserveMove(s));
  }
  return candidates.filter((m) => m.rankImpactReais > 0).sort((a, b) => b.rankImpactReais - a.rankImpactReais).slice(0, 2);
}
