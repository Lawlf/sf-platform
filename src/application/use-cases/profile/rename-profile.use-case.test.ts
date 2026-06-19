import { describe, expect, it, vi } from "vitest";

import type { ProfileEntity } from "@/domain/entities/profile.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { ProfileNotFound } from "@/domain/errors/profile-errors";
import { isErr, isOk } from "@/shared/errors/result";

import { renameProfile } from "./rename-profile.use-case";

const NOW = new Date("2026-06-18T00:00:00Z");

function makeProfile(over: Partial<ProfileEntity> = {}): ProfileEntity {
  return {
    id: "pf-1",
    userId: "u1",
    type: "PF",
    linkedProfileId: null,
    displayName: "Original",
    isPrimary: true,
    taxClassification: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

describe("renameProfile", () => {
  it("owner renames own profile", async () => {
    const profile = makeProfile();
    const rename = vi.fn(async () => undefined);
    const findById = vi.fn(async () => profile);

    const result = await renameProfile(
      { profiles: { findById, rename } },
      { userId: "u1", profileId: "pf-1", displayName: "  Novo Nome  " },
    );

    expect(isOk(result)).toBe(true);
    expect(rename).toHaveBeenCalledWith("pf-1", "Novo Nome");
  });

  it("trims whitespace from displayName", async () => {
    const profile = makeProfile();
    const rename = vi.fn(async () => undefined);

    await renameProfile(
      { profiles: { findById: vi.fn(async () => profile), rename } },
      { userId: "u1", profileId: "pf-1", displayName: "  Espaços  " },
    );

    expect(rename).toHaveBeenCalledWith("pf-1", "Espaços");
  });

  it("non-owner gets Forbidden", async () => {
    const profile = makeProfile({ userId: "u2" });
    const rename = vi.fn();

    const result = await renameProfile(
      { profiles: { findById: vi.fn(async () => profile), rename } },
      { userId: "u1", profileId: "pf-1", displayName: "Hackeado" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(rename).not.toHaveBeenCalled();
  });

  it("returns ProfileNotFound when profile does not exist", async () => {
    const result = await renameProfile(
      { profiles: { findById: vi.fn(async () => null), rename: vi.fn() } },
      { userId: "u1", profileId: "nao-existe", displayName: "Nome" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(ProfileNotFound);
    }
  });
});
