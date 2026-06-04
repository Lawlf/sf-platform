export interface ReportTransaction {
  occurredAt: Date;
  amountCents: bigint;
  category: string | null;
}

export interface MonthTotal {
  month: number;
  totalCents: bigint;
}

export interface CategoryTotal {
  category: string | null;
  totalCents: bigint;
}

export interface AnnualReport {
  year: number;
  totalCents: bigint;
  byMonth: MonthTotal[];
  byCategory: CategoryTotal[];
}

export class TransactionReportService {
  static annualReport(transactions: ReportTransaction[], year: number): AnnualReport {
    const byMonth = new Map<number, bigint>();
    for (let m = 1; m <= 12; m++) byMonth.set(m, 0n);
    const byCategory = new Map<string | null, bigint>();
    let totalCents = 0n;

    for (const t of transactions) {
      if (t.occurredAt.getUTCFullYear() !== year) continue;
      const month = t.occurredAt.getUTCMonth() + 1;
      byMonth.set(month, (byMonth.get(month) ?? 0n) + t.amountCents);
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0n) + t.amountCents);
      totalCents += t.amountCents;
    }

    const months: MonthTotal[] = [];
    for (let m = 1; m <= 12; m++) months.push({ month: m, totalCents: byMonth.get(m) ?? 0n });

    const categories: CategoryTotal[] = [...byCategory.entries()]
      .map(([category, cents]) => ({ category, totalCents: cents }))
      .sort((a, b) => (b.totalCents > a.totalCents ? 1 : b.totalCents < a.totalCents ? -1 : 0));

    return { year, totalCents, byMonth: months, byCategory: categories };
  }
}
