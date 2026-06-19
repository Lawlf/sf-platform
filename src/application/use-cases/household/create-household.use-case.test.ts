import { describe, expect, it, vi } from "vitest";

import type { HouseholdEntity, HouseholdMemberEntity } from "@/domain/entities/household.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isOk } from "@/shared/errors/result";

import { createHousehold } from "./create-household.use-case";

function makeHousehold(overrides: Partial<HouseholdEntity> = {}): HouseholdEntity {
  return {
    id: "h1",
    name: "Família Silva",
    createdByUserId: "u1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeRepo(household: HouseholdEntity): HouseholdRepositoryPort {
  const addedMembers: HouseholdMemberEntity[] = [];
  return {
    createHousehold: vi.fn(async () => household),
    addMember: vi.fn(async (input) => {
      addedMembers.push({
        householdId: input.householdId,
        userId: input.userId,
        role: input.role,
        joinedAt: input.now,
      });
    }),
    removeMember: vi.fn(),
    setRole: vi.fn(),
    listMembers: vi.fn(async () => addedMembers),
    findMembership: vi.fn(),
    listHouseholdsForUser: vi.fn(),
    findHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
    createInvite: vi.fn(),
    findInvite: vi.fn(),
    listPendingInvitesForRef: vi.fn(),
    setInviteStatus: vi.fn(),
  } as unknown as HouseholdRepositoryPort;
}

function makeClock(now = new Date("2026-06-18T10:00:00Z")): Clock {
  return { now: vi.fn(() => now) };
}

describe("createHousehold", () => {
  it("creates household and adds creator as admin", async () => {
    const household = makeHousehold();
    const repo = makeRepo(household);
    const clock = makeClock();

    const result = await createHousehold(
      { households: repo, clock },
      { userId: "u1", name: "Família Silva" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.name).toBe("Família Silva");
      expect(result.value.createdByUserId).toBe("u1");
    }

    expect(repo.createHousehold).toHaveBeenCalledOnce();
    expect(repo.addMember).toHaveBeenCalledOnce();
    expect(repo.addMember).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", role: "admin" }),
    );
  });

  it("addMember receives the same householdId returned by createHousehold", async () => {
    const household = makeHousehold({ id: "hh-abc" });
    const repo = makeRepo(household);
    const clock = makeClock();

    await createHousehold({ households: repo, clock }, { userId: "u1", name: "Lar" });

    const addCall = (repo.addMember as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | { householdId: string }
      | undefined;
    const createCall = (repo.createHousehold as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | { id: string }
      | undefined;
    expect(addCall?.householdId).toBe(createCall?.id);
  });
});
