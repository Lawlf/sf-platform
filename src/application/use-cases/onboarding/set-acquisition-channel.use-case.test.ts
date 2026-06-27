import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";
import { isOk } from "@/shared/errors/result";

import { setAcquisitionChannel } from "./set-acquisition-channel.use-case";

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "u1",
    email: "a@b.com",
    emailVerifiedAt: new Date(),
    displayName: null,
    role: "user",
    plan: "free",
    isPro: false,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    onboardingWizardSeenAt: null,
    homeTourDismissedAt: null,
    acquisitionChannel: null,
    acquisitionChannelOther: null,
    quickAccess: [],
    username: null,
    profileFlair: null,
    baseCurrency: "BRL",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDeps(user: UserEntity | null) {
  const update = vi.fn().mockResolvedValue(undefined);
  const deps = {
    users: { findById: vi.fn().mockResolvedValue(user), update },
  } as unknown as Parameters<typeof setAcquisitionChannel>[0];
  return { deps, update };
}

describe("setAcquisitionChannel", () => {
  it("persists a named channel without detail", async () => {
    const { deps, update } = makeDeps(makeUser());
    const result = await setAcquisitionChannel(deps, { userId: "u1", channel: "tiktok" });
    expect(isOk(result)).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ acquisitionChannel: "tiktok", acquisitionChannelOther: null }),
    );
  });

  it("persists the free-text detail when channel is other", async () => {
    const { deps, update } = makeDeps(makeUser());
    const result = await setAcquisitionChannel(deps, {
      userId: "u1",
      channel: "other",
      detail: "meu contador indicou",
    });
    expect(isOk(result)).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ acquisitionChannel: "other", acquisitionChannelOther: "meu contador indicou" }),
    );
  });

  it("ignores detail when channel is not other", async () => {
    const { deps, update } = makeDeps(makeUser());
    await setAcquisitionChannel(deps, { userId: "u1", channel: "instagram", detail: "ignored" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ acquisitionChannel: "instagram", acquisitionChannelOther: null }),
    );
  });

  it("returns an error when the user does not exist", async () => {
    const { deps } = makeDeps(null);
    const result = await setAcquisitionChannel(deps, { userId: "missing", channel: "google_search" });
    expect(isOk(result)).toBe(false);
  });
});
