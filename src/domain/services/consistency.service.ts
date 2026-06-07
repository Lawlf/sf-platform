import type { PrescriptionState } from "./prescription/prescription.types";

const TIERS: ReadonlyArray<{ min: number; label: string }> = [
  { min: 60, label: "Cinco anos firme" },
  { min: 24, label: "Dois anos firme" },
  { min: 12, label: "Um ano firme" },
  { min: 6, label: "Constância" },
  { min: 3, label: "No ritmo" },
  { min: 1, label: "Início" },
  { min: 0, label: "Começo" },
];

const MILESTONES: readonly number[] = [3, 6, 12, 24, 60];

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function tierFor(monthsActive: number): string {
  const tier = TIERS.find((t) => monthsActive >= t.min);
  return tier ? tier.label : "Começo";
}

export function nextMilestoneFor(monthsActive: number): {
  milestone: number | null;
  monthsToNext: number | null;
} {
  const next = MILESTONES.find((m) => m > monthsActive);
  if (next === undefined) return { milestone: null, monthsToNext: null };
  return { milestone: next, monthsToNext: next - monthsActive };
}

function monthIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function buildTrail(activeMonthIsos: string[], now: Date): boolean[] {
  const set = new Set(activeMonthIsos);
  const trail: boolean[] = [];
  for (let offset = 0; offset <= 5; offset++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    trail.push(set.has(monthIso(d)));
  }
  return trail;
}

export function formatMonthShort(d: Date): string {
  const mon = MONTHS_PT[d.getUTCMonth()] ?? "";
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${mon}/${yy}`;
}

export interface ClosingWithMetrics {
  month: Date;
  endNetWorthCents: bigint;
  endDebtBalanceCents: bigint;
  endReserveCents: bigint;
  committedPctBps: number;
}

export type DeltaLever = "debt" | "reserve" | "committed" | "net_worth";

export interface ConsistencyDelta {
  lever: DeltaLever;
  direction: "positive" | "negative" | "flat";
  amountCents: bigint | null;
  pointsBps: number | null;
  sinceLabel: string;
}

const STATE_LEVER: Record<string, DeltaLever | null> = {
  bleeding: "debt",
  tight: "committed",
  no_cushion: "reserve",
  ready_to_grow: "net_worth",
  incomplete: null,
};

export function computeDelta(
  state: PrescriptionState,
  closings: ClosingWithMetrics[],
): ConsistencyDelta | null {
  const lever = STATE_LEVER[state] ?? null;
  if (lever === null) return null;
  if (closings.length < 2) return null;

  const first = closings[0]!;
  const last = closings[closings.length - 1]!;
  const sinceLabel = formatMonthShort(first.month);

  if (lever === "committed") {
    const improvement = first.committedPctBps - last.committedPctBps;
    return {
      lever,
      direction: dir(improvement),
      amountCents: null,
      pointsBps: Math.abs(improvement),
      sinceLabel,
    };
  }

  let improvementCents: bigint;
  if (lever === "debt") {
    improvementCents = first.endDebtBalanceCents - last.endDebtBalanceCents;
  } else if (lever === "reserve") {
    improvementCents = last.endReserveCents - first.endReserveCents;
  } else {
    improvementCents = last.endNetWorthCents - first.endNetWorthCents;
  }
  return {
    lever,
    direction: dirBig(improvementCents),
    amountCents: improvementCents < 0n ? -improvementCents : improvementCents,
    pointsBps: null,
    sinceLabel,
  };
}

function dir(n: number): "positive" | "negative" | "flat" {
  return n > 0 ? "positive" : n < 0 ? "negative" : "flat";
}

function dirBig(n: bigint): "positive" | "negative" | "flat" {
  return n > 0n ? "positive" : n < 0n ? "negative" : "flat";
}
