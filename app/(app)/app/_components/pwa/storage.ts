import type { GatingState } from "@/app/(app)/app/_lib/pwa/gating";

const KEY = "sf_pwa_install_state";

interface Persisted {
  shownInCycle: number;
  cycleStart: number | null;
  lastDismissedAt: number | null;
  valueMoment: boolean;
  sessionCount: number;
  installed: boolean;
}

const DEFAULTS: Persisted = {
  shownInCycle: 0,
  cycleStart: null,
  lastDismissedAt: null,
  valueMoment: false,
  sessionCount: 0,
  installed: false,
};

function read(): Persisted {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Persisted>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(value: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    return;
  }
}

export function readPersisted(): Persisted {
  return read();
}

export function bumpSession(): number {
  const cur = read();
  const next = { ...cur, sessionCount: cur.sessionCount + 1 };
  write(next);
  return next.sessionCount;
}

export function markValueMomentStored(): void {
  const cur = read();
  if (cur.valueMoment) return;
  write({ ...cur, valueMoment: true });
}

export function markInstalled(): void {
  write({ ...read(), installed: true });
}

export function persistShown(state: GatingState): void {
  const cur = read();
  write({
    ...cur,
    shownInCycle: state.shownInCycle,
    cycleStart: state.cycleStart,
  });
}

export function persistDismissed(state: GatingState): void {
  const cur = read();
  write({ ...cur, lastDismissedAt: state.lastDismissedAt });
}
