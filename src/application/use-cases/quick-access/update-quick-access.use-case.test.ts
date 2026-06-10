import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";

import { updateQuickAccess } from "./update-quick-access.use-case";

const NOW = new Date("2026-05-26T00:00:00Z");
const LATER = new Date("2026-05-27T12:00:00Z");
const ALLOWED = ["add_debt", "add_income", "add_asset", "timeline"];

function user(): UserEntity {
  return {
    id: "u1", email: "a@b.com", emailVerifiedAt: NOW, displayName: "A",
    role: "user", plan: "pro", isPro: true, deactivatedAt: null, deactivationReason: null,
    contentDiagnosticAnswer: null, contentDiagnosticAnsweredAt: null,
    onboardingWizardSeenAt: null, homeTourDismissedAt: null,
    createdAt: NOW, updatedAt: NOW, quickAccess: [], username: null, profileFlair: null, baseCurrency: "BRL",
  };
}

describe("updateQuickAccess", () => {
  it("normalizes (dedupe/filter/cap) and persists the normalized list", async () => {
    const update = vi.fn<(user: UserEntity) => Promise<void>>(async () => {});
    const result = await updateQuickAccess(
      { users: { update } },
      { user: user(), keys: ["timeline", "timeline", "bogus", "add_debt"], allowedKeys: ALLOWED, now: LATER },
    );
    expect(result).toEqual(["timeline", "add_debt"]);
    expect(update).toHaveBeenCalledTimes(1);
    const persisted = update.mock.lastCall![0];
    expect(persisted.quickAccess).toEqual(["timeline", "add_debt"]);
    expect(persisted.updatedAt).toBe(LATER);
  });

  it("persists an empty list when given no valid keys", async () => {
    const update = vi.fn<(user: UserEntity) => Promise<void>>(async () => {});
    const result = await updateQuickAccess(
      { users: { update } },
      { user: user(), keys: ["bogus"], allowedKeys: ALLOWED, now: LATER },
    );
    expect(result).toEqual([]);
    expect(update.mock.lastCall![0].quickAccess).toEqual([]);
  });
});
