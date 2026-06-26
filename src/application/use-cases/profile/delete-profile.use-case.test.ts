import { describe, expect, it, vi } from "vitest";

import type { ProfileEntity } from "@/domain/entities/profile.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { ProfilePrimaryCannotBeDeleted } from "@/domain/errors/profile-errors";
import { isErr, isOk } from "@/shared/errors/result";

import { deleteProfile } from "./delete-profile.use-case";

const NOW = new Date("2026-06-18T00:00:00Z");

function makeProfile(over: Partial<ProfileEntity> = {}): ProfileEntity {
  return {
    id: "pj-1",
    userId: "u1",
    type: "PJ_MEI",
    linkedProfileId: "pf-1",
    displayName: "Empresa",
    isPrimary: false,
    taxClassification: "mei",
    conservativeLevel: "normal",
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

function makeDeps(opts: {
  target: ProfileEntity | null;
  linkedPf?: ProfileEntity | null;
}) {
  const setLinkedProfile = vi.fn(async () => undefined);
  const deleteFn = vi.fn(async () => undefined);

  return {
    setLinkedProfile,
    deleteFn,
    profiles: {
      findById: vi.fn(async () => opts.target),
      findByLinkedProfileId: vi.fn(async () => opts.linkedPf ?? null),
      setLinkedProfile,
      delete: deleteFn,
    },
  };
}

describe("deleteProfile", () => {
  it("deletes a non-primary profile and unlinks paired PF", async () => {
    const pj = makeProfile();
    const pf: ProfileEntity = {
      id: "pf-1",
      userId: "u1",
      type: "PF",
      linkedProfileId: "pj-1",
      displayName: null,
      isPrimary: true,
      taxClassification: null,
      conservativeLevel: "normal",
      createdAt: NOW,
      updatedAt: NOW,
    };
    const { profiles, setLinkedProfile, deleteFn } = makeDeps({ target: pj, linkedPf: pf });

    const result = await deleteProfile({ profiles }, { userId: "u1", profileId: "pj-1" });

    expect(isOk(result)).toBe(true);
    expect(setLinkedProfile).toHaveBeenCalledWith("pf-1", null);
    expect(deleteFn).toHaveBeenCalledWith("pj-1");
  });

  it("deletes a non-primary profile with no linked pair", async () => {
    const pj = makeProfile({ linkedProfileId: null });
    const { profiles, setLinkedProfile, deleteFn } = makeDeps({ target: pj, linkedPf: null });

    const result = await deleteProfile({ profiles }, { userId: "u1", profileId: "pj-1" });

    expect(isOk(result)).toBe(true);
    expect(setLinkedProfile).not.toHaveBeenCalled();
    expect(deleteFn).toHaveBeenCalledWith("pj-1");
  });

  it("non-owner gets Forbidden", async () => {
    const pj = makeProfile({ userId: "u2" });
    const { profiles, deleteFn } = makeDeps({ target: pj });

    const result = await deleteProfile({ profiles }, { userId: "u1", profileId: "pj-1" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não é seu");
    }
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("primary PF profile cannot be deleted", async () => {
    const pf = makeProfile({ id: "pf-1", type: "PF", isPrimary: true });
    const { profiles, deleteFn } = makeDeps({ target: pf });

    const result = await deleteProfile({ profiles }, { userId: "u1", profileId: "pf-1" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(ProfilePrimaryCannotBeDeleted);
      expect(result.error.message).toBe("Não dá pra excluir seu perfil principal.");
    }
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("returns Forbidden when profile not found", async () => {
    const { profiles } = makeDeps({ target: null });

    const result = await deleteProfile({ profiles }, { userId: "u1", profileId: "nao-existe" });

    expect(isErr(result)).toBe(true);
  });
});
