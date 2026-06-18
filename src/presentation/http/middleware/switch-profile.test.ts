import { describe, expect, it } from "vitest";

import type { ProfileEntity } from "@/domain/entities/profile.entity";

const NOW = new Date("2026-06-18T00:00:00Z");

function pf(userId: string, id = "pf-1"): ProfileEntity {
  return { id, userId, type: "PF", linkedProfileId: null, displayName: null, createdAt: NOW, updatedAt: NOW };
}
function pj(userId: string, id = "pj-1"): ProfileEntity {
  return { id, userId, type: "PJ_MEI", linkedProfileId: "pf-1", displayName: null, createdAt: NOW, updatedAt: NOW };
}

function ownsProfile(profiles: ProfileEntity[], profileId: string): boolean {
  return profiles.some((p) => p.id === profileId);
}

describe("switchProfile ownership check", () => {
  it("aceita profileId que pertence ao usuário (PF)", () => {
    const profiles = [pf("u1"), pj("u1")];
    expect(ownsProfile(profiles, "pf-1")).toBe(true);
  });

  it("aceita profileId que pertence ao usuário (PJ_MEI)", () => {
    const profiles = [pf("u1"), pj("u1")];
    expect(ownsProfile(profiles, "pj-1")).toBe(true);
  });

  it("rejeita profileId de outro usuário", () => {
    const profiles = [pf("u1")];
    expect(ownsProfile(profiles, "pj-alheio")).toBe(false);
  });

  it("rejeita profileId inexistente", () => {
    const profiles = [pf("u1"), pj("u1")];
    expect(ownsProfile(profiles, "nao-existe")).toBe(false);
  });

  it("rejeita quando a lista está vazia", () => {
    expect(ownsProfile([], "pf-1")).toBe(false);
  });
});
