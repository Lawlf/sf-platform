// src/domain/services/prescription/prescription.types.ts
import type { PrescriptionConfig } from "@/domain/config/prescription-config";
import type { DebtEntity } from "@/domain/entities/debt.entity";

export type PrescriptionState =
  | "incomplete"
  | "tight" // apertado
  | "bleeding" // sangrando
  | "no_cushion" // sem colchão
  | "ready_to_grow"; // pronto pra crescer

export type MoveType = "reduce_commitment" | "pay_debt" | "build_reserve" | "invest";

export type ReasonCode =
  | "highest_rate" // dívida de maior juro
  | "below_reserve_floor" // reserva abaixo do piso
  | "below_min_safety" // reserva abaixo do colchão mínimo (guard-rail)
  | "no_expensive_debt_reserve_ok" // pronto pra crescer
  | "negative_free_balance" // saldo livre negativo
  | "income_over_committed" // renda comprometida alta
  | "keep_buffer_estimated"; // renda variável: manter folga em vez de investir

export type MissingInput = "income" | "debt_rate";

/** Métricas estruturadas; o presenter formata a copy PT-BR. Valores em reais. */
export interface MoveMetrics {
  interestSavedReais?: number;
  monthsSaved?: number;
  reserveGapReais?: number;
  monthsToReserve?: number | null;
  monthlyContributionReais?: number;
  projectedGrowthReais?: number;
  targetReductionReais?: number;
  /** mês de quitação da dívida COM o pagamento extra. */
  monthsToPayoff?: number | null;
  /** true quando, pagando só o mínimo, a dívida nunca quitaria (amortização negativa). */
  baselineNeverPayoff?: boolean;
  /** true quando a dívida-alvo usou a taxa estimada (rotativo sem taxa cadastrada). */
  rateEstimated?: boolean;
}

export interface PrescriptionMove {
  type: MoveType;
  reasonCode: ReasonCode;
  /** rótulo da dívida-alvo, quando aplicável (pay_debt). */
  targetDebtId?: string;
  targetDebtLabel?: string;
  metrics: MoveMetrics;
  /** impacto em reais para ranqueamento do "ver mais". Maior = mais relevante. */
  rankImpactReais: number;
}

export interface PrescriptionSnapshot {
  now: Date;
  /** somente dívidas ativas (status === "active"). */
  debts: DebtEntity[];
  monthlyIncomeReais: number;
  /** soma do monthlyDebtService das dívidas recorrentes (gastos essenciais). */
  monthlyEssentialReais: number;
  /** renda - soma(monthlyDebtOutflow do mês corrente). pode ser negativo. */
  freeBalanceReais: number;
  /** soma(monthlyDebtService)/renda*100. 0-100+. */
  committedPct: number;
  /** total de ativos da categoria "cash" (reserva/liquidez), em reais. */
  reserveReais: number;
  /** true quando alguma renda do mês tem isEstimated=true (renda variável/irregular). */
  hasEstimatedIncome: boolean;
  config: PrescriptionConfig;
}

/** Trecho da timeline multi-mês: para onde a sobra vai entre transições. */
export type CascadeSegment =
  | { kind: "debt"; debtLabel: string; startMonth: number; payoffMonth: number }
  | { kind: "reserve"; startMonth: number }
  | { kind: "horizon_cut"; debtLabel: string; startMonth: number };

export interface Prescription {
  state: PrescriptionState;
  /** renda do mês menos a saída de dívida do mês (monthlyDebtOutflow). pode ser negativo. */
  freeBalanceReais: number;
  /** soma(monthlyDebtService)/renda*100. métrica estrutural estável (não cai com pagamento parcial do mês). */
  committedPct: number;
  /** true quando alguma renda do mês tem isEstimated=true (renda variável/irregular). */
  hasEstimatedIncome: boolean;
  /** null somente quando state === "incomplete". */
  dominant: PrescriptionMove | null;
  /** itens 2 e 3 do "ver mais" (máx 2). dominant + alternatives ≤ 3. */
  alternatives: PrescriptionMove[];
  /**
   * Sequência multi-mês "para onde a sobra vai". Vazia quando não se qualifica
   * (sem cascata real); aí a UI cai no "Depois dessa". Substitui as alternatives
   * no expand quando preenchida.
   */
  timeline: CascadeSegment[];
  completeness: {
    complete: boolean;
    missing: MissingInput[];
  };
}
