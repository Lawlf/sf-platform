import { describe, expect, it, vi } from "vitest";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { HouseholdMemberEntity, HouseholdMemberProfileEntity } from "@/domain/entities/household.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import {
  buildHouseholdPrescription,
  type BuildHouseholdPrescriptionDeps,
} from "./build-household-prescription.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

const m = (r: number) => {
  const x = Money.from(r);
  if (!isOk(x)) throw new Error("m");
  return x.value;
};

const rate = (d: number) => {
  const x = InterestRate.fromMonthly(d);
  if (!isOk(x)) throw new Error("r");
  return x.value;
};

function makeMembership(userId: string): HouseholdMemberEntity {
  return { householdId: "h1", userId, role: "member", joinedAt: NOW };
}

function makeShare(
  opts: { profileId: string; userId: string },
): HouseholdMemberProfileEntity {
  return {
    householdId: "h1",
    profileId: opts.profileId,
    userId: opts.userId,
    shareLevel: "aggregate",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeIncome(id: string, userId: string, profileId: string, amount: number): IncomeEntity {
  return {
    id,
    userId,
    profileId,
    label: "Renda",
    amount: m(amount),
    frequency: "monthly",
    startDate: NOW,
    paymentDay: null,
    endDate: null,
    isEstimated: false,
    isActive: true,
    createdAt: NOW,
    deletedAt: null,
  };
}

function makeFxDeps() {
  return {
    rates: {
      upsertDaily: vi.fn(),
      findLatest: vi.fn().mockResolvedValue(null),
    },
    overrides: {
      find: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      remove: vi.fn(),
      listForUser: vi.fn(),
    },
    clock: { now: vi.fn(() => NOW) },
  };
}

function makeDeps(opts: {
  membership: HouseholdMemberEntity | null;
  sharedProfiles?: HouseholdMemberProfileEntity[];
  members?: HouseholdMemberEntity[];
  debtsPerProfile?: Record<string, DebtEntity[]>;
  incomesPerProfile?: Record<string, IncomeEntity[]>;
}): BuildHouseholdPrescriptionDeps {
  const members = opts.members ?? (opts.membership ? [opts.membership] : []);
  return {
    households: {
      findMembership: vi.fn(async () => opts.membership),
      listSharedProfiles: vi.fn(async () => opts.sharedProfiles ?? []),
      listMembers: vi.fn(async () => members),
    },
    debts: {
      listForProfile: vi.fn(async (profileId: string) =>
        opts.debtsPerProfile?.[profileId] ?? [],
      ),
    },
    incomes: {
      listForProfile: vi.fn(async (profileId: string) =>
        opts.incomesPerProfile?.[profileId] ?? [],
      ),
    },
    assets: {
      findActiveByProfile: vi.fn(async () => []),
    },
    now: () => NOW,
    ...makeFxDeps(),
  };
}

function makeExpensiveCard(id: string, userId: string): DebtEntity {
  return {
    id,
    userId,
    kind: "credit_card",
    status: "active",
    label: `Cartão ${id}`,
    currentBalance: m(3000),
    originalPrincipal: m(3000),
    creditLimit: m(6000),
    statementDay: 1,
    dueDay: 10,
    currentStatement: m(1000),
    revolvingBalance: m(3000),
    revolvingMonthlyRate: rate(0.129),
    installmentPurchases: [],
    createdAt: NOW,
    deletedAt: null,
  } as unknown as DebtEntity;
}

describe("buildHouseholdPrescription", () => {
  it("non-member returns Forbidden", async () => {
    const deps = makeDeps({ membership: null });

    const result = await buildHouseholdPrescription(deps, {
      householdId: "h1",
      userId: "u1",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não faz parte");
    }
  });

  it("2 profiles from 2 owners produces a single combined prescription", async () => {
    const share1 = makeShare({ profileId: "p1", userId: "u1" });
    const share2 = makeShare({ profileId: "p2", userId: "u2" });

    const income1 = makeIncome("i1", "u1", "p1", 5000);
    const income2 = makeIncome("i2", "u2", "p2", 3000);

    const deps = makeDeps({
      membership: makeMembership("u1"),
      sharedProfiles: [share1, share2],
      members: [makeMembership("u1"), makeMembership("u2")],
      incomesPerProfile: {
        p1: [income1],
        p2: [income2],
      },
    });

    const result = await buildHouseholdPrescription(deps, {
      householdId: "h1",
      userId: "u1",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(typeof result.value.state).toBe("string");
      expect(result.value.state).not.toBe("incomplete");
      expect(result.value.dominant).toBeDefined();
    }
  });

  it("orphan share (owner no longer a member) is excluded", async () => {
    const activeShare = makeShare({ profileId: "p1", userId: "current-user" });
    const orphanShare = makeShare({ profileId: "p2", userId: "ex-user" });

    const activeIncome = makeIncome("i1", "current-user", "p1", 5000);
    const orphanIncome = makeIncome("i2", "ex-user", "p2", 99999);

    const listForProfile = vi.fn(async (profileId: string) => {
      if (profileId === "p1") return [activeIncome];
      return [orphanIncome];
    });

    const deps: BuildHouseholdPrescriptionDeps = {
      households: {
        findMembership: vi.fn(async () => makeMembership("caller")),
        listSharedProfiles: vi.fn(async () => [activeShare, orphanShare]),
        listMembers: vi.fn(async () => [makeMembership("caller"), makeMembership("current-user")]),
      },
      debts: { listForProfile: vi.fn(async () => []) },
      incomes: { listForProfile },
      assets: { findActiveByProfile: vi.fn(async () => []) },
      now: () => NOW,
      ...makeFxDeps(),
    };

    const result = await buildHouseholdPrescription(deps, {
      householdId: "h1",
      userId: "caller",
    });

    expect(isOk(result)).toBe(true);
    expect(listForProfile).toHaveBeenCalledWith("p1", { onlyActive: true });
    expect(listForProfile).not.toHaveBeenCalledWith("p2", expect.anything());
  });

  it("FX is resolved using the share OWNER userId, not the caller", async () => {
    const share = makeShare({ profileId: "pX", userId: "owner-user" });
    const income = makeIncome("iX", "owner-user", "pX", 5000);

    const findLatest = vi.fn().mockResolvedValue(null);

    const deps: BuildHouseholdPrescriptionDeps = {
      households: {
        findMembership: vi.fn(async () => makeMembership("caller")),
        listSharedProfiles: vi.fn(async () => [share]),
        listMembers: vi.fn(async () => [makeMembership("caller"), makeMembership("owner-user")]),
      },
      debts: { listForProfile: vi.fn(async () => []) },
      incomes: { listForProfile: vi.fn(async () => [income]) },
      assets: { findActiveByProfile: vi.fn(async () => []) },
      now: () => NOW,
      rates: { upsertDaily: vi.fn(), findLatest },
      overrides: {
        find: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
        remove: vi.fn(),
        listForUser: vi.fn(),
      },
      clock: { now: vi.fn(() => NOW) },
    };

    const result = await buildHouseholdPrescription(deps, {
      householdId: "h1",
      userId: "caller",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.state).not.toBe("incomplete");
    }
  });
});
