export interface FinancingSeed {
  principalCents: string;
  annualRatePct: number | null;
  termMonths: number | null;
}

export type FinancingSearchParamsLike = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function centsOrNull(v: string | null): string | null {
  return v !== null && /^\d+$/.test(v) ? v : null;
}

function intOrNull(v: string | null): number | null {
  if (v === null || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function numOrNull(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function buildFinancingSeedQuery(seed: FinancingSeed): string {
  const p = new URLSearchParams();
  p.set("from", "sim");
  p.set("principalCents", seed.principalCents);
  if (seed.annualRatePct != null) p.set("annualRatePct", String(seed.annualRatePct));
  if (seed.termMonths != null) p.set("termMonths", String(seed.termMonths));
  return p.toString();
}

export function parseFinancingSeed(sp: FinancingSearchParamsLike): FinancingSeed | null {
  if (first(sp.from) !== "sim") return null;
  const principalCents = centsOrNull(first(sp.principalCents));
  if (principalCents === null || principalCents === "0") return null;
  return {
    principalCents,
    annualRatePct: numOrNull(first(sp.annualRatePct)),
    termMonths: intOrNull(first(sp.termMonths)),
  };
}
