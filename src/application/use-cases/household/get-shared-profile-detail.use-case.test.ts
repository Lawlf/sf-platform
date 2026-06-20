import { describe, expect, it, vi } from "vitest";

import type {
  HouseholdMemberEntity,
  HouseholdMemberProfileEntity,
} from "@/domain/entities/household.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { getSharedProfileDetail } from "./get-shared-profile-detail.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeMembership(userId = "u1"): HouseholdMemberEntity {
  return { householdId: "h1", userId, role: "member", joinedAt: NOW };
}

function makeSharedProfile(
  profileId: string,
  shareLevel: "aggregate" | "detail",
): HouseholdMemberProfileEntity {
  return {
    householdId: "h1",
    userId: "u2",
    profileId,
    shareLevel,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeIncome(profileId: string): IncomeEntity {
  return {
    id: "i1",
    userId: "u2",
    profileId,
    label: "Salário",
    amount: Money.fromCents(300_000n),
    frequency: "monthly",
    startDate: NOW,
    endDate: null,
    isActive: true,
    paymentDay: null,
    isEstimated: false,
    sourceBreakdown: null,
    createdAt: NOW,
    deletedAt: null,
  };
}

function makeDebt(profileId: string): DebtEntity {
  return {
    id: "d1",
    userId: "u2",
    profileId,
    kind: "financing",
    label: "Financiamento",
    originalPrincipal: Money.fromCents(10_000_000n),
    currentBalance: Money.fromCents(8_000_000n),
    interestRate: null,
    monthlyPayment: Money.fromCents(100_000n),
    startDate: NOW,
    dueDate: null,
    termMonths: 120,
    status: "active",
    currency: "BRL",
    linkedAssetId: null,
    categoryKey: null,
    monthlyMinimumPayment: null,
    creditLimit: null,
    creditLimitCurrency: null,
    dueDay: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  } as unknown as DebtEntity;
}

function makeHouseholdsRepo(opts: {
  callerMembership: HouseholdMemberEntity | null;
  ownerMembership?: HouseholdMemberEntity | null;
  sharedProfile: HouseholdMemberProfileEntity | null;
}): HouseholdRepositoryPort {
  return {
    createHousehold: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    removeSharedProfilesForUser: vi.fn(),
    setRole: vi.fn(),
    listMembers: vi.fn(),
    findMembership: vi.fn(async (_hid: string, userId: string) => {
      if (userId === opts.callerMembership?.userId) return opts.callerMembership;
      if (opts.ownerMembership !== undefined && userId === opts.sharedProfile?.userId) {
        return opts.ownerMembership;
      }
      return null;
    }),
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
    findSharedProfile: vi.fn(async () => opts.sharedProfile),
    listSharedProfiles: vi.fn(),
    listSharedProfilesForUser: vi.fn(),
  } as unknown as HouseholdRepositoryPort;
}

function makeIncomesRepo(incomes: IncomeEntity[]): IncomeRepositoryPort {
  return {
    findById: vi.fn(),
    listForProfile: vi.fn(async () => incomes),
    create: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };
}

function makeDebtsRepo(debts: DebtEntity[]): DebtRepositoryPort {
  return {
    findById: vi.fn(),
    listForProfile: vi.fn(async () => debts),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(),
    reassignExpenseCategory: vi.fn(),
  };
}

describe("getSharedProfileDetail", () => {
  it("non-member returns Forbidden", async () => {
    const deps = {
      households: makeHouseholdsRepo({ callerMembership: null, sharedProfile: null }),
      incomes: makeIncomesRepo([]),
      debts: makeDebtsRepo([]),
    };

    const result = await getSharedProfileDetail(deps, {
      householdId: "h1",
      userId: "u1",
      profileId: "p1",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(deps.incomes.listForProfile).not.toHaveBeenCalled();
    expect(deps.debts.listForProfile).not.toHaveBeenCalled();
  });

  it("profile shared at aggregate level returns Forbidden — does not leak detail", async () => {
    const aggregateShare = makeSharedProfile("p1", "aggregate");
    const deps = {
      households: makeHouseholdsRepo({
        callerMembership: makeMembership("u1"),
        sharedProfile: aggregateShare,
      }),
      incomes: makeIncomesRepo([makeIncome("p1")]),
      debts: makeDebtsRepo([makeDebt("p1")]),
    };

    const result = await getSharedProfileDetail(deps, {
      householdId: "h1",
      userId: "u1",
      profileId: "p1",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não está disponível");
    }
    expect(deps.incomes.listForProfile).not.toHaveBeenCalled();
    expect(deps.debts.listForProfile).not.toHaveBeenCalled();
  });

  it("profile not shared at all returns Forbidden — not found treated as unauthorized", async () => {
    const deps = {
      households: makeHouseholdsRepo({
        callerMembership: makeMembership("u1"),
        sharedProfile: null,
      }),
      incomes: makeIncomesRepo([]),
      debts: makeDebtsRepo([]),
    };

    const result = await getSharedProfileDetail(deps, {
      householdId: "h1",
      userId: "u1",
      profileId: "p99",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(deps.incomes.listForProfile).not.toHaveBeenCalled();
  });

  it("profile shared at detail level returns incomes and debts", async () => {
    const detailShare = makeSharedProfile("p1", "detail");
    const income = makeIncome("p1");
    const debt = makeDebt("p1");

    const deps = {
      households: makeHouseholdsRepo({
        callerMembership: makeMembership("u1"),
        ownerMembership: makeMembership("u2"),
        sharedProfile: detailShare,
      }),
      incomes: makeIncomesRepo([income]),
      debts: makeDebtsRepo([debt]),
    };

    const result = await getSharedProfileDetail(deps, {
      householdId: "h1",
      userId: "u1",
      profileId: "p1",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.incomes).toHaveLength(1);
      expect(result.value.debts).toHaveLength(1);
      expect(result.value.incomes[0]?.id).toBe("i1");
      expect(result.value.debts[0]?.id).toBe("d1");
    }

    expect(deps.incomes.listForProfile).toHaveBeenCalledWith("p1");
    expect(deps.debts.listForProfile).toHaveBeenCalledWith("p1", { status: "all" });
  });

  it("listForProfile is never called before all gates pass", async () => {
    const deps = {
      households: makeHouseholdsRepo({
        callerMembership: null,
        sharedProfile: makeSharedProfile("p1", "detail"),
      }),
      incomes: makeIncomesRepo([]),
      debts: makeDebtsRepo([]),
    };

    await getSharedProfileDetail(deps, {
      householdId: "h1",
      userId: "u1",
      profileId: "p1",
    });

    expect(deps.incomes.listForProfile).not.toHaveBeenCalled();
    expect(deps.debts.listForProfile).not.toHaveBeenCalled();
  });

  it("share owner is no longer a member — returns Forbidden without leaking data", async () => {
    const detailShare = makeSharedProfile("p1", "detail");
    const deps = {
      households: makeHouseholdsRepo({
        callerMembership: makeMembership("u1"),
        ownerMembership: null,
        sharedProfile: detailShare,
      }),
      incomes: makeIncomesRepo([makeIncome("p1")]),
      debts: makeDebtsRepo([makeDebt("p1")]),
    };

    const result = await getSharedProfileDetail(deps, {
      householdId: "h1",
      userId: "u1",
      profileId: "p1",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não está disponível");
    }
    expect(deps.incomes.listForProfile).not.toHaveBeenCalled();
    expect(deps.debts.listForProfile).not.toHaveBeenCalled();
  });
});
