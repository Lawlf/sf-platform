import { describe, expect, it } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";

import { setProfileFlair, type SetProfileFlairDeps } from "./set-profile-flair.use-case";

function user(over: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "u1", email: "a@x.com", emailVerifiedAt: null, displayName: "A", role: "user", plan: "free",
    isPro: false, deactivatedAt: null, deactivationReason: null, contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null, onboardingWizardSeenAt: null, homeTourDismissedAt: null,
    acquisitionChannel: null, acquisitionChannelOther: null,
    quickAccess: [], baseCurrency: "BRL", proGraceUntil: null, freeKeptProfileId: null, username: "a", profileFlair: null, createdAt: new Date(),
    updatedAt: new Date(), ...over,
  };
}

function deps(current: UserEntity): { saved: UserEntity[]; d: SetProfileFlairDeps } {
  const saved: UserEntity[] = [];
  const d: SetProfileFlairDeps = { users: { findById: async () => current, update: async (u: UserEntity) => { saved.push(u); } } };
  return { saved, d };
}

describe("setProfileFlair", () => {
  it("grava key válida", async () => {
    const { d, saved } = deps(user());
    const ok = await setProfileFlair(d, { userId: "u1", flairKey: "cauteloso" });
    expect(ok).toBe(true);
    expect(saved[0]!.profileFlair).toBe("cauteloso");
  });
  it("rejeita key inválida", async () => {
    const { d, saved } = deps(user());
    const ok = await setProfileFlair(d, { userId: "u1", flairKey: "xxx" });
    expect(ok).toBe(false);
    expect(saved).toHaveLength(0);
  });
  it("null limpa", async () => {
    const { d, saved } = deps(user({ profileFlair: "cauteloso" }));
    const ok = await setProfileFlair(d, { userId: "u1", flairKey: null });
    expect(ok).toBe(true);
    expect(saved[0]!.profileFlair).toBeNull();
  });
});
