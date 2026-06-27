import type { TransactionDirection } from "@/domain/entities/transaction.entity";

export interface AssetCostInput {
  occurredAt: Date;
  direction: TransactionDirection;
  amountCents: bigint;
  category: string | null;
  currency: string;
  excludedFromTotals: boolean;
  deletedAt: Date | null;
}

export interface AssetCostWindow {
  outCents: bigint;
  inCents: bigint;
  netCents: bigint;
  byCategory: Array<{ category: string; totalCents: bigint }>;
}

export interface AssetCostView {
  month: AssetCostWindow;
  last12: AssetCostWindow;
  sincePurchase: AssetCostWindow | null;
}

export interface AssetCostOptions {
  referenceDate: Date;
  purchaseDate: Date | null;
}

export type AssetCostProjectionBasis = "trailing_12m" | "extrapolated" | "estimate" | "none";

export interface AssetCostProjection {
  annualCents: bigint;
  basis: AssetCostProjectionBasis;
}

export interface AssetCostProjectionOptions {
  referenceDate: Date;
  monthlyEstimateCents: bigint | null;
}

const UNCATEGORIZED = "outros";

function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function inRange(at: Date, from: Date, to: Date): boolean {
  return at.getTime() >= from.getTime() && at.getTime() <= to.getTime();
}

function summarize(rows: AssetCostInput[]): AssetCostWindow {
  let outCents = 0n;
  let inCents = 0n;
  const byCategory = new Map<string, bigint>();
  for (const r of rows) {
    if (r.direction === "out") {
      outCents += r.amountCents;
      const key = r.category ?? UNCATEGORIZED;
      byCategory.set(key, (byCategory.get(key) ?? 0n) + r.amountCents);
    } else {
      inCents += r.amountCents;
    }
  }
  const categories = [...byCategory.entries()]
    .map(([category, totalCents]) => ({ category, totalCents }))
    .sort((a, b) => (b.totalCents > a.totalCents ? 1 : b.totalCents < a.totalCents ? -1 : 0));
  return { outCents, inCents, netCents: inCents - outCents, byCategory: categories };
}

export class AssetCostService {
  static compute(transactions: AssetCostInput[], opts: AssetCostOptions): AssetCostView {
    const ref = opts.referenceDate;
    const counted = transactions.filter(
      (t) => t.deletedAt === null && !t.excludedFromTotals && t.currency === "BRL",
    );

    const upper = endOfMonth(ref);
    const monthFrom = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
    const last12From = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 11, 1));

    const month = summarize(counted.filter((t) => inRange(t.occurredAt, monthFrom, upper)));
    const last12 = summarize(counted.filter((t) => inRange(t.occurredAt, last12From, upper)));
    const sincePurchase = opts.purchaseDate
      ? summarize(counted.filter((t) => inRange(t.occurredAt, opts.purchaseDate!, upper)))
      : null;

    return { month, last12, sincePurchase };
  }

  /**
   * Projeta o custo anual do bem ("nesse ritmo, ~R$X/ano"). Quando há 12+ meses
   * de gasto atrelado, usa o total real dos últimos 12 meses (captura picos
   * anuais como IPVA). Com histórico parcial (2 a 11 meses), extrapola a média
   * mensal. Um único mês não projeta sozinho (ruído). Sem gasto suficiente, cai
   * pra estimativa recorrente; sem nada, basis "none".
   */
  static projectAnnual(
    transactions: AssetCostInput[],
    opts: AssetCostProjectionOptions,
  ): AssetCostProjection {
    const ref = opts.referenceDate;
    const upper = endOfMonth(ref);
    const last12From = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 11, 1));

    const out = transactions.filter(
      (t) =>
        t.direction === "out" &&
        t.deletedAt === null &&
        !t.excludedFromTotals &&
        t.currency === "BRL" &&
        inRange(t.occurredAt, last12From, upper),
    );

    if (out.length > 0) {
      const sum = out.reduce((acc, t) => acc + t.amountCents, 0n);
      const refIndex = ref.getUTCFullYear() * 12 + ref.getUTCMonth();
      const earliest = out.reduce(
        (min, t) => Math.min(min, t.occurredAt.getUTCFullYear() * 12 + t.occurredAt.getUTCMonth()),
        refIndex,
      );
      const monthsElapsed = Math.min(12, Math.max(1, refIndex - earliest + 1));
      if (monthsElapsed >= 12) {
        return { annualCents: sum, basis: "trailing_12m" };
      }
      if (monthsElapsed >= 2) {
        const m = BigInt(monthsElapsed);
        return { annualCents: (sum * 12n + m / 2n) / m, basis: "extrapolated" };
      }
    }

    if (opts.monthlyEstimateCents !== null) {
      return { annualCents: opts.monthlyEstimateCents * 12n, basis: "estimate" };
    }

    return { annualCents: 0n, basis: "none" };
  }
}
