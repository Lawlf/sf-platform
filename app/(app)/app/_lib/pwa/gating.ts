export interface GatingState {
  installed: boolean;
  standalone: boolean;
  supported: boolean;
  valueMoment: boolean;
  sessionCount: number;
  shownInCycle: number;
  cycleStart: number | null;
  lastDismissedAt: number | null;
}

export const MAX_SHOWS_PER_CYCLE = 2;
export const CYCLE_MS = 30 * 24 * 60 * 60 * 1000;
export const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function cycleExpired(state: GatingState, now: number): boolean {
  return state.cycleStart === null || now - state.cycleStart > CYCLE_MS;
}

export function shouldShowBanner(state: GatingState, now: number): boolean {
  if (state.installed || state.standalone || !state.supported) return false;

  const triggerReady = state.valueMoment || state.sessionCount >= 2;
  if (!triggerReady) return false;

  if (state.lastDismissedAt !== null && now - state.lastDismissedAt < DISMISS_COOLDOWN_MS) {
    return false;
  }

  const shown = cycleExpired(state, now) ? 0 : state.shownInCycle;
  if (shown >= MAX_SHOWS_PER_CYCLE) return false;

  return true;
}

export function registerShown(state: GatingState, now: number): GatingState {
  if (cycleExpired(state, now)) {
    return { ...state, cycleStart: now, shownInCycle: 1 };
  }
  return { ...state, shownInCycle: state.shownInCycle + 1 };
}

export function registerDismissed(state: GatingState, now: number): GatingState {
  return { ...state, lastDismissedAt: now };
}
