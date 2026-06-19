import { describe, expect, it, vi } from "vitest";

import type { ProfileEntity } from "@/domain/entities/profile.entity";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";

import { resolveActiveProfileId } from "./active-profile";

const NOW = new Date("2026-06-17T00:00:00Z");

function pf(userId: string, id = "pf-1"): ProfileEntity {
  return { id, userId, type: "PF", linkedProfileId: null, displayName: null, isPrimary: true, taxClassification: null, createdAt: NOW, updatedAt: NOW };
}
function pj(userId: string, id = "pj-1"): ProfileEntity {
  return { id, userId, type: "PJ_MEI", linkedProfileId: "pf-1", displayName: null, isPrimary: false, taxClassification: null, createdAt: NOW, updatedAt: NOW };
}

function fakeRepo(profilesList: ProfileEntity[], ensured?: ProfileEntity): ProfileRepositoryPort {
  return {
    listForUser: vi.fn(async () => profilesList),
    findById: vi.fn(async () => null),
    findPrimaryPf: vi.fn(async (userId: string) => profilesList.find((p) => p.userId === userId && p.isPrimary) ?? null),
    findByLinkedProfileId: vi.fn(async () => null),
    ensurePfProfile: vi.fn(async () => ensured ?? pf("u1")),
    create: vi.fn(),
    rename: vi.fn(),
    delete: vi.fn(),
    setLinkedProfile: vi.fn(),
  };
}

describe("resolveActiveProfileId", () => {
  it("retorna o PF quando não há cookie", async () => {
    const repo = fakeRepo([pf("u1")]);
    const id = await resolveActiveProfileId({ profiles: repo }, { userId: "u1", cookieProfileId: null, now: NOW });
    expect(id).toBe("pf-1");
  });

  it("retorna o perfil do cookie quando ele pertence ao usuário", async () => {
    const repo = fakeRepo([pf("u1"), pj("u1")]);
    const id = await resolveActiveProfileId({ profiles: repo }, { userId: "u1", cookieProfileId: "pj-1", now: NOW });
    expect(id).toBe("pj-1");
  });

  it("ignora cookie de perfil que não pertence ao usuário e cai pro PF", async () => {
    const repo = fakeRepo([pf("u1")]);
    const id = await resolveActiveProfileId({ profiles: repo }, { userId: "u1", cookieProfileId: "alheio", now: NOW });
    expect(id).toBe("pf-1");
  });

  it("cria o PF (ensure) quando o usuário ainda não tem nenhum", async () => {
    const repo = fakeRepo([], pf("u1", "pf-novo"));
    const id = await resolveActiveProfileId({ profiles: repo }, { userId: "u1", cookieProfileId: null, now: NOW });
    expect(repo.ensurePfProfile).toHaveBeenCalledWith("u1", NOW);
    expect(id).toBe("pf-novo");
  });
});
