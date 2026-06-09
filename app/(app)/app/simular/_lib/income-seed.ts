export type IncomeSeedFrequency = "monthly" | "weekly" | "one_off";

export interface IncomeSeed {
  amountCents: string;
  frequency: IncomeSeedFrequency;
  label: string;
}

export type IncomeSearchParamsLike = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function centsOrNull(v: string | null): string | null {
  return v !== null && /^\d+$/.test(v) ? v : null;
}

const FREQUENCIES: IncomeSeedFrequency[] = ["monthly", "weekly", "one_off"];

export function buildIncomeSeedQuery(seed: IncomeSeed): string {
  const p = new URLSearchParams();
  p.set("from", "sim");
  p.set("amountCents", seed.amountCents);
  p.set("frequency", seed.frequency);
  p.set("label", seed.label);
  return p.toString();
}

export function parseIncomeSeed(sp: IncomeSearchParamsLike): IncomeSeed | null {
  if (first(sp.from) !== "sim") return null;
  const amountCents = centsOrNull(first(sp.amountCents));
  if (amountCents === null || amountCents === "0") return null;
  const freqRaw = first(sp.frequency);
  const frequency = FREQUENCIES.includes(freqRaw as IncomeSeedFrequency)
    ? (freqRaw as IncomeSeedFrequency)
    : "monthly";
  const label = (first(sp.label) ?? "").slice(0, 120);
  return { amountCents, frequency, label };
}
