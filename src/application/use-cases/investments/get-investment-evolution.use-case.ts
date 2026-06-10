import type { InvestmentSnapshotRepositoryPort } from "@/domain/ports/repositories/investment-snapshot.repository";

export interface InvestmentEvolutionMonth {
  /** "YYYY-MM". */
  month: string;
  byType: Record<string, bigint>;
}

export interface InvestmentEvolution {
  types: string[];
  months: InvestmentEvolutionMonth[];
}

export interface GetInvestmentEvolutionDeps {
  snapshots: InvestmentSnapshotRepositoryPort;
}

export async function getInvestmentEvolution(
  deps: GetInvestmentEvolutionDeps,
  input: { userId: string },
): Promise<InvestmentEvolution> {
  const rows = await deps.snapshots.listForUser(input.userId);
  if (rows.length === 0) return { types: [], months: [] };

  const typeSet = new Set<string>();
  const byMonth = new Map<string, Record<string, bigint>>();
  for (const r of rows) {
    typeSet.add(r.investmentType);
    const key = r.month.toISOString().slice(0, 7);
    const bucket = byMonth.get(key) ?? {};
    bucket[r.investmentType] = (bucket[r.investmentType] ?? 0n) + r.totalValueCents;
    byMonth.set(key, bucket);
  }
  const types = Array.from(typeSet).sort();
  const months = Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, raw]) => {
      const byType: Record<string, bigint> = {};
      for (const t of types) byType[t] = raw[t] ?? 0n;
      return { month, byType };
    });
  return { types, months };
}
