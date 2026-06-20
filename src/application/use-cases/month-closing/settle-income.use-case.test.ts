import { describe, expect, it, vi } from "vitest";

import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { IncomeNotFound } from "@/domain/errors/financial-errors";
import type { IncomeSettlementRepositoryPort } from "@/domain/ports/repositories/income-settlement.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { settleIncome } from "./settle-income.use-case";

const OWNER = "user-1";
const INCOME_ID = "inc-1";

function makeIncome(overrides: Partial<IncomeEntity> = {}): IncomeEntity {
  return {
    id: INCOME_ID,
    userId: OWNER,
    profileId: "profile-1",
    label: "Salário",
    amount: Money.fromCents(500_000n),
    frequency: "monthly",
    startDate: new Date(Date.UTC(2026, 0, 1)),
    endDate: null,
    isEstimated: false,
    sourceBreakdown: null,
    isActive: true,
    paymentDay: 5,
    createdAt: new Date(Date.UTC(2026, 0, 1)),
    deletedAt: null,
    ...overrides,
  };
}

function makeIncomeRepo(income: IncomeEntity | null): IncomeRepositoryPort {
  return {
    findById: vi.fn(async () => income),
    listForProfile: vi.fn(),
    create: vi.fn(async (e) => e),
    update: vi.fn(async (e) => e),
    softDelete: vi.fn(),
    setActive: vi.fn(),
  } as unknown as IncomeRepositoryPort;
}

function makeSettlementsRepo(): IncomeSettlementRepositoryPort {
  return {
    upsert: vi.fn(),
    listForProfileMonth: vi.fn(),
    listForProfile: vi.fn(),
  };
}

function makeClock(now = new Date("2026-04-02T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function firstArg<T>(fn: unknown): T {
  const mock = fn as ReturnType<typeof vi.fn>;
  const call = mock.mock.calls[0];
  if (!call) throw new Error("expected the mock to have been called");
  return call[0] as T;
}

describe("settleIncome", () => {
  it("retorna IncomeNotFound quando a renda não existe", async () => {
    const res = await settleIncome(
      { incomes: makeIncomeRepo(null), settlements: makeSettlementsRepo(), clock: makeClock() },
      {
        userId: OWNER,
        profileId: "profile-1",
        incomeId: INCOME_ID,
        monthIso: "2026-03",
        action: "received",
      },
    );
    expect(isErr(res)).toBe(true);
    if (isErr(res)) expect(res.error).toBeInstanceOf(IncomeNotFound);
  });

  it("retorna Forbidden quando a renda é de outro perfil", async () => {
    const income = makeIncome({ userId: "someone-else", profileId: "profile-2" });
    const res = await settleIncome(
      { incomes: makeIncomeRepo(income), settlements: makeSettlementsRepo(), clock: makeClock() },
      {
        userId: OWNER,
        profileId: "profile-1",
        incomeId: INCOME_ID,
        monthIso: "2026-03",
        action: "received",
      },
    );
    expect(isErr(res)).toBe(true);
    if (isErr(res)) expect(res.error).toBeInstanceOf(Forbidden);
  });

  it("received: grava settlement received sem adjustedAmount", async () => {
    const settlements = makeSettlementsRepo();
    const res = await settleIncome(
      { incomes: makeIncomeRepo(makeIncome()), settlements, clock: makeClock() },
      {
        userId: OWNER,
        profileId: "profile-1",
        incomeId: INCOME_ID,
        monthIso: "2026-03",
        action: "received",
      },
    );
    expect(isOk(res)).toBe(true);
    expect(settlements.upsert).toHaveBeenCalledTimes(1);
    const s = firstArg<IncomeSettlementEntity>(settlements.upsert);
    expect(s.status).toBe("received");
    expect(s.adjustedAmountCents).toBeNull();
    expect(s.month.getTime()).toBe(new Date("2026-03-01T00:00:00Z").getTime());
  });

  it("not_received: grava settlement not_received com adjustedAmount null", async () => {
    const settlements = makeSettlementsRepo();
    const res = await settleIncome(
      { incomes: makeIncomeRepo(makeIncome()), settlements, clock: makeClock() },
      {
        userId: OWNER,
        profileId: "profile-1",
        incomeId: INCOME_ID,
        monthIso: "2026-03",
        action: "not_received",
      },
    );
    expect(isOk(res)).toBe(true);
    const s = firstArg<IncomeSettlementEntity>(settlements.upsert);
    expect(s.status).toBe("not_received");
    expect(s.adjustedAmountCents).toBeNull();
  });

  it("adjusted: grava settlement adjusted com adjustedAmountCents", async () => {
    const settlements = makeSettlementsRepo();
    const res = await settleIncome(
      {
        incomes: makeIncomeRepo(makeIncome()),
        settlements,
        clock: makeClock(new Date("2026-04-02T10:00:00Z")),
      },
      {
        userId: OWNER,
        profileId: "profile-1",
        incomeId: INCOME_ID,
        monthIso: "2026-03",
        action: "adjusted",
        adjustedAmountCents: 320_000n,
      },
    );
    expect(isOk(res)).toBe(true);
    const s = firstArg<IncomeSettlementEntity>(settlements.upsert);
    expect(s.status).toBe("adjusted");
    expect(s.adjustedAmountCents).toBe(320_000n);
    expect(s.createdAt.getTime()).toBe(new Date("2026-04-02T10:00:00Z").getTime());
  });
});
