import { describe, expect, it, vi } from "vitest";

import type { HouseholdMemberEntity, HouseholdMemberProfileEntity } from "@/domain/entities/household.entity";
import type { ProfileEntity } from "@/domain/entities/profile.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import type { FinancialSnapshotEntity } from "@/domain/entities/financial-snapshot.entity";
import type { NetWorthSnapshot } from "@/domain/services/patrimony.service";
import { Money } from "@/domain/value-objects/money.vo";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { isErr, isOk, ok, unwrapOr } from "@/shared/errors/result";

import {
  buildHouseholdSnapshot,
  type BuildHouseholdSnapshotDeps,
} from "./build-household-snapshot.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeMembership(userId = "u1"): HouseholdMemberEntity {
  return { householdId: "h1", userId, role: "member", joinedAt: NOW };
}

function makeSharedProfile(
  opts: Partial<HouseholdMemberProfileEntity> & { profileId: string; userId: string },
): HouseholdMemberProfileEntity {
  return {
    householdId: "h1",
    shareLevel: "aggregate",
    createdAt: NOW,
    updatedAt: NOW,
    ...opts,
  };
}

function makeProfile(id: string, userId: string, displayName: string | null = null): ProfileEntity {
  return {
    id,
    userId,
    type: "PF",
    linkedProfileId: null,
    displayName,
    isPrimary: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeSnapshotEntity(incomeCents: bigint, serviceCents: bigint): FinancialSnapshotEntity {
  return {
    id: "snap-1",
    userId: "u1",
    asOfDate: NOW,
    totalIncome: Money.fromCents(incomeCents),
    totalDebtBalance: Money.fromCents(0n),
    totalMonthlyService: Money.fromCents(serviceCents),
    monthlyFreeCashFlow: Money.fromCents(incomeCents - serviceCents),
    cetWeightedAverage: unwrapOr(InterestRate.fromMonthly(0), null as never),
    incomeCommittedPct: 0,
  };
}

function makeNetWorthSnapshot(netWorthCents: bigint): NetWorthSnapshot {
  return {
    totalAssets: Money.fromCents(netWorthCents > 0n ? netWorthCents : 0n),
    totalDebtBalance: Money.fromCents(0n),
    allocatedDebtBalance: Money.fromCents(0n),
    unallocatedDebtBalance: Money.fromCents(0n),
    netWorth: Money.fromCents(netWorthCents),
    byCategory: [],
  };
}

function makeHouseholdsRepo(opts: {
  membership: HouseholdMemberEntity | null;
  sharedProfiles?: HouseholdMemberProfileEntity[];
}): HouseholdRepositoryPort {
  return {
    createHousehold: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    setRole: vi.fn(),
    listMembers: vi.fn(),
    findMembership: vi.fn(async () => opts.membership),
    listHouseholdsForUser: vi.fn(),
    findHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
    createInvite: vi.fn(),
    findInvite: vi.fn(),
    listPendingInvitesForRef: vi.fn(),
    listPendingInvitesForHousehold: vi.fn(),
    setInviteStatus: vi.fn(),
    upsertSharedProfile: vi.fn(),
    removeSharedProfile: vi.fn(),
    findSharedProfile: vi.fn(),
    listSharedProfiles: vi.fn(async () => opts.sharedProfiles ?? []),
    listSharedProfilesForUser: vi.fn(),
  } as unknown as HouseholdRepositoryPort;
}

function makeProfilesRepo(profiles: ProfileEntity[]): ProfileRepositoryPort {
  return {
    listForUser: vi.fn(),
    findById: vi.fn(async (id: string) => profiles.find((p) => p.id === id) ?? null),
    findPrimaryPf: vi.fn(),
    ensurePfProfile: vi.fn(),
    create: vi.fn(),
    setLinkedProfile: vi.fn(),
  };
}

function makeDeps(opts: {
  membership: HouseholdMemberEntity | null;
  sharedProfiles?: HouseholdMemberProfileEntity[];
  profiles?: ProfileEntity[];
  getDashboardSnapshot?: BuildHouseholdSnapshotDeps["getDashboardSnapshot"];
  getNetWorth?: BuildHouseholdSnapshotDeps["getNetWorth"];
}): BuildHouseholdSnapshotDeps {
  return {
    households: makeHouseholdsRepo({
      membership: opts.membership,
      sharedProfiles: opts.sharedProfiles ?? [],
    }),
    profiles: makeProfilesRepo(opts.profiles ?? []),
    getDashboardSnapshot:
      opts.getDashboardSnapshot ??
      vi.fn(async () => ok(makeSnapshotEntity(0n, 0n))),
    getNetWorth:
      opts.getNetWorth ??
      vi.fn(async () => ok(makeNetWorthSnapshot(0n))),
  };
}

describe("buildHouseholdSnapshot", () => {
  it("non-member returns Forbidden", async () => {
    const deps = makeDeps({ membership: null });

    const result = await buildHouseholdSnapshot(deps, { householdId: "h1", userId: "u1" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não faz parte");
    }
  });

  it("member with 2 shared profiles from 2 owners combines snapshot correctly", async () => {
    const share1 = makeSharedProfile({ profileId: "p1", userId: "u1", shareLevel: "aggregate" });
    const share2 = makeSharedProfile({ profileId: "p2", userId: "u2", shareLevel: "detail" });

    const profile1 = makeProfile("p1", "u1", "Alice");
    const profile2 = makeProfile("p2", "u2", "Bob");

    const dashboardCalls: { userId: string; profileId: string }[] = [];
    const getDashboardSnapshot = vi.fn(
      async (_deps: unknown, input: { userId: string; profileId: string }) => {
        dashboardCalls.push(input);
        if (input.profileId === "p1") return ok(makeSnapshotEntity(500_000n, 100_000n));
        return ok(makeSnapshotEntity(300_000n, 50_000n));
      },
    );

    const getNetWorth = vi.fn(
      async (_deps: unknown, input: { userId: string; profileId: string }) => {
        if (input.profileId === "p1") return ok(makeNetWorthSnapshot(2_000_000n));
        return ok(makeNetWorthSnapshot(-500_000n));
      },
    );

    const deps = makeDeps({
      membership: makeMembership("u1"),
      sharedProfiles: [share1, share2],
      profiles: [profile1, profile2],
      getDashboardSnapshot,
      getNetWorth,
    });

    const result = await buildHouseholdSnapshot(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const view = result.value;
      expect(view.totalIncomeCents).toBe(800_000n);
      expect(view.totalMonthlyServiceCents).toBe(150_000n);
      expect(view.freeCents).toBe(650_000n);
      expect(view.netWorthCents).toBe(1_500_000n);
      expect(view.committedPctBps).toBe(1875n);
      expect(view.contributions).toHaveLength(2);
    }

    expect(getDashboardSnapshot).toHaveBeenCalledTimes(2);
    expect(dashboardCalls[0]).toEqual(expect.objectContaining({ userId: "u1", profileId: "p1" }));
    expect(dashboardCalls[1]).toEqual(expect.objectContaining({ userId: "u2", profileId: "p2" }));
  });

  it("aggregate share level appears in contributions with correct shareLevel", async () => {
    const share = makeSharedProfile({ profileId: "p1", userId: "u1", shareLevel: "aggregate" });
    const profile = makeProfile("p1", "u1", "Meu perfil");

    const deps = makeDeps({
      membership: makeMembership("u1"),
      sharedProfiles: [share],
      profiles: [profile],
      getDashboardSnapshot: vi.fn(async () => ok(makeSnapshotEntity(100_000n, 20_000n))),
      getNetWorth: vi.fn(async () => ok(makeNetWorthSnapshot(500_000n))),
    });

    const result = await buildHouseholdSnapshot(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const c = result.value.contributions[0];
      expect(c?.profileId).toBe("p1");
      expect(c?.shareLevel).toBe("aggregate");
      expect(c?.displayName).toBe("Meu perfil");
    }
  });

  it("getDashboardSnapshot is called with the OWNER userId, not the caller", async () => {
    const share = makeSharedProfile({ profileId: "pX", userId: "owner-user", shareLevel: "aggregate" });
    const profile = makeProfile("pX", "owner-user", null);

    const getDashboardSnapshot = vi.fn(async () => ok(makeSnapshotEntity(0n, 0n)));
    const getNetWorth = vi.fn(async () => ok(makeNetWorthSnapshot(0n)));

    const deps = makeDeps({
      membership: makeMembership("caller-user"),
      sharedProfiles: [share],
      profiles: [profile],
      getDashboardSnapshot,
      getNetWorth,
    });

    await buildHouseholdSnapshot(deps, { householdId: "h1", userId: "caller-user" });

    expect(getDashboardSnapshot).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ userId: "owner-user", profileId: "pX" }),
    );
    expect(getNetWorth).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ userId: "owner-user", profileId: "pX" }),
    );
  });
});
