import {
  SavingsComparisonService,
  type SavingsProductResult,
} from "@/domain/services/savings-comparison.service";

import type { ComparableProduct } from "./options";

export interface ProjectionPoint {
  month: number;
  grossYieldCents: bigint;
  taxCents: bigint;
  netYieldCents: bigint;
  finalCents: bigint;
}

export interface Projection {
  points: ProjectionPoint[];
  final: SavingsProductResult;
}

export function projectSeries(input: {
  amountCents: bigint;
  product: ComparableProduct;
  cdiAnnualPct: number;
  months?: number;
}): Projection {
  const months = input.months ?? 12;
  const points: ProjectionPoint[] = [];
  let final: SavingsProductResult | null = null;
  for (let m = 1; m <= months; m++) {
    const r = SavingsComparisonService.compare({
      amountCents: input.amountCents,
      months: m,
      cdiAnnualPct: input.cdiAnnualPct,
      cdbPctCdi: 100,
    })[input.product];
    points.push({
      month: m,
      grossYieldCents: r.grossYieldCents,
      taxCents: r.taxCents,
      netYieldCents: r.netYieldCents,
      finalCents: r.finalCents,
    });
    if (m === months) final = r;
  }
  return { points, final: final! };
}

// Tabela oficial do IOF regressivo sobre o rendimento (dia 1 = 96%, dia 30 = 0%).
const IOF_REGRESSIVE = [
  0, 0.96, 0.93, 0.9, 0.86, 0.83, 0.8, 0.76, 0.73, 0.7, 0.66, 0.63, 0.6, 0.56, 0.53, 0.5, 0.46,
  0.43, 0.4, 0.36, 0.33, 0.3, 0.26, 0.23, 0.2, 0.16, 0.13, 0.1, 0.06, 0.03, 0,
];

export interface EarlyWithdrawalSample {
  day: number;
  grossCents: bigint;
  iofCents: bigint;
  netCents: bigint;
}

function reaisToCents(reais: number): bigint {
  return BigInt(Math.round(reais * 100));
}

function withdrawalAt(amount: number, annual: number, day: number): EarlyWithdrawalSample {
  const daily = Math.pow(1 + annual, 1 / 365) - 1;
  const gross = amount * (Math.pow(1 + daily, day) - 1);
  const iofRate = IOF_REGRESSIVE[Math.min(Math.max(day, 0), 30)] ?? 0;
  const iof = gross * iofRate;
  const ir = (gross - iof) * 0.225;
  const net = gross - iof - ir;
  return {
    day,
    grossCents: reaisToCents(gross),
    iofCents: reaisToCents(iof),
    netCents: reaisToCents(net),
  };
}

// IOF + IR (22,5%, prazo <= 180 dias) sobre saque antes de 30 dias. Só renda fixa
// com rendimento diário (CDB, Tesouro). Poupança tem outra regra (aniversário), retorna [].
export function earlyWithdrawalSamples(input: {
  amountCents: bigint;
  product: ComparableProduct;
  cdiAnnualPct: number;
  days?: number[];
}): EarlyWithdrawalSample[] {
  if (input.product === "poupanca") return [];
  const amount = Number(input.amountCents) / 100;
  if (amount <= 0) return [];
  const annual = input.cdiAnnualPct / 100;
  const days = input.days ?? [10, 20, 30];
  return days.map((d) => withdrawalAt(amount, annual, d));
}

// Série diária do saque antecipado (dia 1 a 30): quanto do rendimento você leva
// se sacar naquele dia, já descontando IOF + IR.
export function earlyWithdrawalSeries(input: {
  amountCents: bigint;
  product: ComparableProduct;
  cdiAnnualPct: number;
}): EarlyWithdrawalSample[] {
  if (input.product === "poupanca") return [];
  const amount = Number(input.amountCents) / 100;
  if (amount <= 0) return [];
  const annual = input.cdiAnnualPct / 100;
  return Array.from({ length: 30 }, (_, i) => withdrawalAt(amount, annual, i + 1));
}
