import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Money } from "@/domain/value-objects/money.vo";
import { ok } from "@/shared/errors/result";

const registerIncome = vi.fn();
const updateIncome = vi.fn();

vi.mock("@/application/use-cases/income/register-income.use-case", () => ({
  registerIncome: (...args: unknown[]) => registerIncome(...args),
}));

vi.mock("@/application/use-cases/income/update-income.use-case", () => ({
  updateIncome: (...args: unknown[]) => updateIncome(...args),
}));

vi.mock("@/presentation/http/middleware/cached-current-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/presentation/http/middleware/active-profile", () => ({
  getActiveProfileId: vi.fn(async () => "profile-1"),
}));

vi.mock("@/infrastructure/clock/system-clock", () => ({
  SystemClock: class {
    now() {
      return new Date("2026-01-15T10:00:00Z");
    }
  },
}));

vi.mock(
  "@/infrastructure/persistence/drizzle/repositories/income.repository",
  () => ({
    IncomeRepository: class {},
  }),
);

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../../_actions/_achievements", () => ({
  awardEventAchievement: vi.fn(async () => undefined),
}));

import { createIncomeAction } from "./create-income.action";
import { updateIncomeAction } from "./update-income.action";

function getAmount(call: unknown[]): Money {
  const input = call[1] as { amount: Money };
  return input.amount;
}

describe("income currency wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerIncome.mockResolvedValue(undefined);
  });

  it("create income with currency USD persists a USD amount", async () => {
    const fd = new FormData();
    fd.set("label", "Consulting");
    fd.set("amountCents", "150000");
    fd.set("frequency", "monthly");
    fd.set("startDate", "2026-01-01");
    fd.set("endDate", "");
    fd.set("currency", "USD");

    const r = await createIncomeAction(fd);

    expect(r.ok).toBe(true);
    expect(registerIncome).toHaveBeenCalledTimes(1);
    const amount = getAmount(registerIncome.mock.calls[0]!);
    expect(amount.currency).toBe("USD");
    expect(amount.toCents()).toBe(150000n);
  });

  it("create income defaults to BRL when no currency is sent", async () => {
    const fd = new FormData();
    fd.set("label", "Salario");
    fd.set("amountCents", "500000");
    fd.set("frequency", "monthly");
    fd.set("startDate", "2026-01-01");
    fd.set("endDate", "");

    const r = await createIncomeAction(fd);

    expect(r.ok).toBe(true);
    const amount = getAmount(registerIncome.mock.calls[0]!);
    expect(amount.currency).toBe("BRL");
  });

  it("update a USD income without changing currency keeps USD", async () => {
    updateIncome.mockImplementation(async (_deps: unknown, input: { amount: Money }) =>
      ok({ amount: input.amount }),
    );

    const fd = new FormData();
    fd.set("incomeId", "11111111-1111-4111-8111-111111111111");
    fd.set("label", "Consulting");
    fd.set("amountCents", "150000");
    fd.set("frequency", "monthly");
    fd.set("startDate", "2026-01-01");
    fd.set("endDate", "");
    fd.set("currency", "USD");

    const r = await updateIncomeAction(fd);

    expect(r.ok).toBe(true);
    expect(updateIncome).toHaveBeenCalledTimes(1);
    const amount = getAmount(updateIncome.mock.calls[0]!);
    expect(amount.currency).toBe("USD");
    expect(amount.toCents()).toBe(150000n);
  });
});
