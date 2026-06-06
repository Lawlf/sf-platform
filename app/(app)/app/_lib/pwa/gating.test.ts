import { describe, expect, it } from "vitest";

import {
  CYCLE_MS,
  DISMISS_COOLDOWN_MS,
  MAX_SHOWS_PER_CYCLE,
  registerDismissed,
  registerShown,
  shouldShowBanner,
  type GatingState,
} from "./gating";

const NOW = 1_700_000_000_000;

function base(overrides: Partial<GatingState> = {}): GatingState {
  return {
    installed: false,
    standalone: false,
    supported: true,
    valueMoment: true,
    sessionCount: 1,
    shownInCycle: 0,
    cycleStart: null,
    lastDismissedAt: null,
    ...overrides,
  };
}

describe("shouldShowBanner", () => {
  it("shows when eligible via value moment", () => {
    expect(shouldShowBanner(base(), NOW)).toBe(true);
  });

  it("hides when already installed or standalone", () => {
    expect(shouldShowBanner(base({ installed: true }), NOW)).toBe(false);
    expect(shouldShowBanner(base({ standalone: true }), NOW)).toBe(false);
  });

  it("hides when platform not supported", () => {
    expect(shouldShowBanner(base({ supported: false }), NOW)).toBe(false);
  });

  it("hides with no trigger (no value moment, first session)", () => {
    expect(shouldShowBanner(base({ valueMoment: false, sessionCount: 1 }), NOW)).toBe(false);
  });

  it("shows via second-session fallback", () => {
    expect(shouldShowBanner(base({ valueMoment: false, sessionCount: 2 }), NOW)).toBe(true);
  });

  it("hides during dismiss cooldown, shows after it", () => {
    const justDismissed = base({ lastDismissedAt: NOW - 1000 });
    expect(shouldShowBanner(justDismissed, NOW)).toBe(false);
    const past = base({ lastDismissedAt: NOW - DISMISS_COOLDOWN_MS - 1 });
    expect(shouldShowBanner(past, NOW)).toBe(true);
  });

  it("hides when cycle cap reached, resets after cycle window", () => {
    const capped = base({ shownInCycle: MAX_SHOWS_PER_CYCLE, cycleStart: NOW });
    expect(shouldShowBanner(capped, NOW)).toBe(false);
    const newCycle = base({
      shownInCycle: MAX_SHOWS_PER_CYCLE,
      cycleStart: NOW - CYCLE_MS - 1,
    });
    expect(shouldShowBanner(newCycle, NOW)).toBe(true);
  });
});

describe("registerShown", () => {
  it("starts a cycle and increments", () => {
    const next = registerShown(base({ cycleStart: null, shownInCycle: 0 }), NOW);
    expect(next.cycleStart).toBe(NOW);
    expect(next.shownInCycle).toBe(1);
  });

  it("resets the counter when the cycle expired", () => {
    const next = registerShown(
      base({ cycleStart: NOW - CYCLE_MS - 1, shownInCycle: 2 }),
      NOW,
    );
    expect(next.cycleStart).toBe(NOW);
    expect(next.shownInCycle).toBe(1);
  });
});

describe("registerDismissed", () => {
  it("stamps the dismissal time", () => {
    const next = registerDismissed(base(), NOW);
    expect(next.lastDismissedAt).toBe(NOW);
  });
});
