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
}
