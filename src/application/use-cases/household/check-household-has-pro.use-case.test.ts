import { describe, expect, it, vi } from "vitest";

import type { HouseholdMemberEntity } from "@/domain/entities/household.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";

import {
  checkHouseholdHasPro,
  type CheckHouseholdHasProDeps,
} from "./check-household-has-pro.use-case";

const NOW = new Date("2026-06-19T10:00:00Z");

function makeMember(userId: string): HouseholdMemberEntity {
  return { householdId: "h1", userId, role: "member", joinedAt: NOW };
}

function makeUser(id: string, isPro: boolean): UserEntity {
  return {
    id,
    email: `${id}@example.com`,
    emailVerifiedAt: NOW,
    displayName: null,
    role: "user",
    plan: isPro ? "pro" : "free",
    isPro,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    onboardingWizardSeenAt: NOW,
    homeTourDismissedAt: null,
    acquisitionChannel: null,
    acquisitionChannelOther: null,
    quickAccess: [],
    username: null,
    profileFlair: null,
    baseCurrency: "BRL", proGraceUntil: null, freeKeptProfileId: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeDeps(members: HouseholdMemberEntity[], users: Map<string, UserEntity>): CheckHouseholdHasProDeps {
  return {
    households: {
      listMembers: vi.fn(async () => members),
    } as unknown as HouseholdRepositoryPort,
    users: {
      findById: vi.fn(async (id: string) => users.get(id) ?? null),
    } as unknown as UserRepositoryPort,
  };
}

describe("checkHouseholdHasPro", () => {
  it("retorna true quando ao menos um membro do lar é Pro (patrocina a mesa)", async () => {
    const members = [makeMember("pro-user"), makeMember("free-user")];
    const users = new Map([
      ["pro-user", makeUser("pro-user", true)],
      ["free-user", makeUser("free-user", false)],
    ]);

    const result = await checkHouseholdHasPro(makeDeps(members, users), { householdId: "h1" });

    expect(result).toBe(true);
  });

  it("retorna false quando nenhum membro é Pro (lar bloqueado)", async () => {
    const members = [makeMember("free-1"), makeMember("free-2")];
    const users = new Map([
      ["free-1", makeUser("free-1", false)],
      ["free-2", makeUser("free-2", false)],
    ]);

    const result = await checkHouseholdHasPro(makeDeps(members, users), { householdId: "h1" });

    expect(result).toBe(false);
  });

  it("degrada: lar que perde o único Pro (membro vira Free) volta a bloquear", async () => {
    const members = [makeMember("ex-pro"), makeMember("free-user")];
    const users = new Map([
      ["ex-pro", makeUser("ex-pro", false)],
      ["free-user", makeUser("free-user", false)],
    ]);

    const result = await checkHouseholdHasPro(makeDeps(members, users), { householdId: "h1" });

    expect(result).toBe(false);
  });

  it("libera com 3+ membros e apenas 1 Pro (regra é existencial, não maioria)", async () => {
    const members = [makeMember("a"), makeMember("b"), makeMember("c")];
    const users = new Map([
      ["a", makeUser("a", false)],
      ["b", makeUser("b", false)],
      ["c", makeUser("c", true)],
    ]);

    const result = await checkHouseholdHasPro(makeDeps(members, users), { householdId: "h1" });

    expect(result).toBe(true);
  });

  it("ignora membro cujo usuário não existe mais (findById null)", async () => {
    const members = [makeMember("ghost")];
    const users = new Map<string, UserEntity>();

    const result = await checkHouseholdHasPro(makeDeps(members, users), { householdId: "h1" });

    expect(result).toBe(false);
  });
});
