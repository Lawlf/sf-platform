import { describe, expect, it, vi } from "vitest";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { HouseholdMemberEntity, HouseholdMemberProfileEntity } from "@/domain/entities/household.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import {
  buildHouseholdGap,
  type BuildHouseholdGapDeps,
} from "./build-household-gap.use-case";

const NOW = new Date("2026-06-01T00:00:00Z");

function m(reais: number): Money {
  const r = Money.from(reais);
  if (!isOk(r)) throw new Error("invalid money");
  return r.value;
}

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

function makeIncome(
  id: string,
  userId: string,
  profileId: string,
  amountReais: number,
  opts: Partial<IncomeEntity> = {},
): IncomeEntity {
  return {
    id,
    userId,
    profileId,
    label: "Salário",
    amount: m(amountReais),
    frequency: "monthly",
    startDate: new Date("2026-01-01T00:00:00Z"),
    endDate: null,
    isActive: true,
    isEstimated: false,
    paymentDay: null,
    createdAt: NOW,
    deletedAt: null,
    ...opts,
  };
}

function makeRecurringDebt(id: string, userId: string, profileId: string, amountReais: number): DebtEntity {
  return {
    id,
    userId,
    profileId,
    kind: "recurring",
    label: "Assinatura",
    status: "active",
    originalPrincipal: m(0),
    currentBalance: m(0),
    startDate: NOW,
    expectedEndDate: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    recurringFrequency: "monthly",
    recurringAmountCents: BigInt(amountReais * 100),
    expenseCategory: "subscriptions",
    dueDay: null,
  } as DebtEntity;
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
  settlementsPerProfile?: Record<string, IncomeSettlementEntity[]>;
}): BuildHouseholdGapDeps {
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
    incomeSettlements: {
      listForProfileMonth: vi.fn(async (profileId: string) =>
        opts.settlementsPerProfile?.[profileId] ?? [],
      ),
    },
    profiles: {
      findById: vi.fn(async () => null),
    },
    now: () => NOW,
    ...makeFxDeps(),
  };
}

describe("buildHouseholdGap", () => {
  it("non-member returns Forbidden", async () => {
    const deps = makeDeps({ membership: null });
    const result = await buildHouseholdGap(deps, { householdId: "h1", userId: "u1" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
      expect(result.error.message).toContain("não faz parte");
    }
  });

  it("2 profiles from 2 owners: sums custos, jaRecebido, aReceber, gap", async () => {
    const share1 = makeShare({ profileId: "p1", userId: "u1" });
    const share2 = makeShare({ profileId: "p2", userId: "u2" });

    const income1 = makeIncome("i1", "u1", "p1", 5000);
    const income2 = makeIncome("i2", "u2", "p2", 3000);

    const debt1 = makeRecurringDebt("d1", "u1", "p1", 500);
    const debt2 = makeRecurringDebt("d2", "u2", "p2", 300);

    const settlement1: IncomeSettlementEntity = {
      userId: "u1",
      profileId: "p1",
      incomeId: "i1",
      month: NOW,
      status: "received",
      adjustedAmountCents: null,
      createdAt: NOW,
    };

    const deps = makeDeps({
      membership: makeMembership("u1"),
      sharedProfiles: [share1, share2],
      members: [makeMembership("u1"), makeMembership("u2")],
      incomesPerProfile: { p1: [income1], p2: [income2] },
      debtsPerProfile: { p1: [debt1], p2: [debt2] },
      settlementsPerProfile: { p1: [settlement1] },
    });

    const result = await buildHouseholdGap(deps, { householdId: "h1", userId: "u1" });
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const gap = result.value;
    expect(gap.custosGarantidosCents).toBe(80000n);
    expect(gap.jaRecebidoCents).toBe(500000n);
    expect(gap.aReceberConfirmadoCents).toBe(300000n);
    expect(gap.aReceberEstimadoCents).toBe(0n);
    expect(gap.gapCents).toBe(80000n - 500000n - 300000n);
    expect(gap.porMembro).toHaveLength(2);

    const member1 = gap.porMembro.find((pm) => pm.profileId === "p1");
    expect(member1?.jaRecebidoCents).toBe(500000n);
    expect(member1?.aReceberConfirmadoCents).toBe(0n);

    const member2 = gap.porMembro.find((pm) => pm.profileId === "p2");
    expect(member2?.jaRecebidoCents).toBe(0n);
    expect(member2?.aReceberConfirmadoCents).toBe(300000n);
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

    const deps: BuildHouseholdGapDeps = {
      households: {
        findMembership: vi.fn(async () => makeMembership("caller")),
        listSharedProfiles: vi.fn(async () => [activeShare, orphanShare]),
        listMembers: vi.fn(async () => [makeMembership("caller"), makeMembership("current-user")]),
      },
      debts: { listForProfile: vi.fn(async () => []) },
      incomes: { listForProfile },
      incomeSettlements: { listForProfileMonth: vi.fn(async () => []) },
      profiles: { findById: vi.fn(async () => null) },
      now: () => NOW,
      ...makeFxDeps(),
    };

    const result = await buildHouseholdGap(deps, { householdId: "h1", userId: "caller" });
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.porMembro).toHaveLength(1);
    const only = result.value.porMembro[0];
    expect(only?.profileId).toBe("p1");
    expect(result.value.aReceberConfirmadoCents).toBe(500000n);

    expect(listForProfile).toHaveBeenCalledWith("p1", { onlyActive: true });
    expect(listForProfile).not.toHaveBeenCalledWith("p2", expect.anything());
  });

  it("estimated income goes to aReceberEstimado, not aReceberConfirmado", async () => {
    const share = makeShare({ profileId: "p1", userId: "u1" });
    const income = makeIncome("i1", "u1", "p1", 4000, { isEstimated: true });

    const deps = makeDeps({
      membership: makeMembership("u1"),
      sharedProfiles: [share],
      members: [makeMembership("u1")],
      incomesPerProfile: { p1: [income] },
    });

    const result = await buildHouseholdGap(deps, { householdId: "h1", userId: "u1" });
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.aReceberEstimadoCents).toBe(400000n);
    expect(result.value.aReceberConfirmadoCents).toBe(0n);
    expect(result.value.gapCents).toBe(0n);
  });

  it("gap = custos - jaRecebido - aReceberConfirmado (can be negative when covered)", async () => {
    const share = makeShare({ profileId: "p1", userId: "u1" });
    const income = makeIncome("i1", "u1", "p1", 10000);
    const debt = makeRecurringDebt("d1", "u1", "p1", 2000);

    const settlement: IncomeSettlementEntity = {
      userId: "u1",
      profileId: "p1",
      incomeId: "i1",
      month: NOW,
      status: "received",
      adjustedAmountCents: null,
      createdAt: NOW,
    };

    const deps = makeDeps({
      membership: makeMembership("u1"),
      sharedProfiles: [share],
      members: [makeMembership("u1")],
      incomesPerProfile: { p1: [income] },
      debtsPerProfile: { p1: [debt] },
      settlementsPerProfile: { p1: [settlement] },
    });

    const result = await buildHouseholdGap(deps, { householdId: "h1", userId: "u1" });
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.custosGarantidosCents).toBe(200000n);
    expect(result.value.jaRecebidoCents).toBe(1000000n);
    expect(result.value.gapCents).toBe(200000n - 1000000n);
    expect(result.value.gapCents < 0n).toBe(true);
  });

  it("no active shares returns zero gap with empty porMembro", async () => {
    const deps = makeDeps({
      membership: makeMembership("u1"),
      sharedProfiles: [],
      members: [makeMembership("u1")],
    });

    const result = await buildHouseholdGap(deps, { householdId: "h1", userId: "u1" });
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.gapCents).toBe(0n);
    expect(result.value.porMembro).toHaveLength(0);
  });
});
