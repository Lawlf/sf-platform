import { describe, expect, it, vi } from "vitest";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { registerIncome } from "./register-income.use-case";

function makeIncomeRepo(): IncomeRepositoryPort {
  return {
    findById: vi.fn(),
    listForProfile: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };
}

function makeClock(now = new Date("2026-01-15T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeAmount(value = 5000): Money {
  const r = Money.from(value);
  if (!isOk(r)) throw new Error("test setup: invalid money");
  return r.value;
}

describe("registerIncome", () => {
  it("creates an active income with generated id and persists via repository", async () => {
    const incomes = makeIncomeRepo();
    const now = new Date("2026-01-15T10:00:00Z");
    const clock = makeClock(now);
    const amount = makeAmount(5000);
    (incomes.create as ReturnType<typeof vi.fn>).mockImplementation(async (e: IncomeEntity) => e);

    const result = await registerIncome(
      { incomes, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        label: "Salario",
        amount,
        frequency: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: null,
      },
    );

    expect(result._tag).toBe("ok");
    expect(incomes.create).toHaveBeenCalledTimes(1);
    const arg = (incomes.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as IncomeEntity;
    expect(arg.userId).toBe("user-1");
    expect(arg.label).toBe("Salario");
    expect(arg.amount).toBe(amount);
    expect(arg.frequency).toBe("monthly");
    expect(arg.endDate).toBeNull();
    expect(arg.isActive).toBe(true);
    expect(arg.createdAt).toBe(now);
    expect(typeof arg.id).toBe("string");
    expect(arg.id.length).toBeGreaterThan(0);
  });

  it("preserves endDate when provided", async () => {
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    const amount = makeAmount(2500);
    (incomes.create as ReturnType<typeof vi.fn>).mockImplementation(async (e: IncomeEntity) => e);

    const endDate = new Date("2026-12-31");
    await registerIncome(
      { incomes, clock },
      {
        userId: "user-2",
        profileId: "profile-1",
        label: "Freelance",
        amount,
        frequency: "one_off",
        startDate: new Date("2026-06-01"),
        endDate,
      },
    );

    const arg = (incomes.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as IncomeEntity;
    expect(arg.endDate).toBe(endDate);
    expect(arg.frequency).toBe("one_off");
  });

  it("returns the persisted entity from the repository", async () => {
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    const amount = makeAmount(1000);
    const persisted: IncomeEntity = {
      id: "persisted-id",
      userId: "user-3",
      profileId: "profile-1",
      label: "Aluguel",
      amount,
      frequency: "weekly",
      startDate: new Date("2026-01-01"),
      paymentDay: null,
      endDate: null,
      isEstimated: false,
      isActive: true,
      createdAt: new Date("2026-01-15T10:00:00Z"),
      deletedAt: null,
    };
    (incomes.create as ReturnType<typeof vi.fn>).mockResolvedValue(persisted);

    const result = await registerIncome(
      { incomes, clock },
      {
        userId: "user-3",
        profileId: "profile-1",
        label: "Aluguel",
        amount,
        frequency: "weekly",
        startDate: new Date("2026-01-01"),
        endDate: null,
      },
    );

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value).toBe(persisted);
    }
  });
});
