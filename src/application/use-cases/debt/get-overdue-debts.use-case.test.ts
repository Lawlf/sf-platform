import { describe, expect, it } from "vitest";

import type { CreditCardDebt, RecurringDebt } from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { getOverdueDebts } from "./get-overdue-debts.use-case";

const fixedClock = (d: Date) => ({ now: () => d });

function makeMoney(cents: bigint): Money {
  return Money.fromCents(cents);
}

function makeCreditCardDebt(overrides: {
  id: string;
  dueDay: number;
  currentStatement?: bigint;
}): CreditCardDebt {
  const statement = makeMoney(overrides.currentStatement ?? 50000n);
  return {
    id: overrides.id,
    userId: "u1",
    profileId: "p1",
    label: `Cartao ${overrides.id}`,
    status: "active",
    originalPrincipal: statement,
    currentBalance: statement,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    kind: "credit_card",
    creditLimit: null,
    statementDay: 5,
    dueDay: overrides.dueDay,
    currentStatement: statement,
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [],
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makeRecurringDebt(overrides: {
  id: string;
  dueDay: number | null;
  recurringAmountCents?: bigint;
}): RecurringDebt {
  return {
    id: overrides.id,
    userId: "u1",
    profileId: "p1",
    label: `Recorrente ${overrides.id}`,
    status: "active",
    originalPrincipal: makeMoney(0n),
    currentBalance: makeMoney(0n),
    startDate: new Date("2026-01-10"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    kind: "recurring",
    recurringFrequency: "monthly",
    recurringAmountCents: overrides.recurringAmountCents ?? 9900n,
    expenseCategory: "subscriptions",
    dueDay: overrides.dueDay,
  };
}

describe("getOverdueDebts", () => {
  it("marca cartao vencido quando dueDay passou e nao ha ack paid", async () => {
    const debts = {
      listForProfile: async () => [
        makeCreditCardDebt({ id: "c1", dueDay: 10, currentStatement: 50000n }),
      ],
    } as any;
    const acks = { listPaidCyclesForUser: async () => [] } as any;
    const res = await getOverdueDebts(
      { debts, acknowledgements: acks, clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
    expect(res.value[0]!.debtId).toBe("c1");
    expect(res.value[0]!.cycleIso).toBe("2026-06");
  });

  it("nao marca vencido se ja existe ack paid do ciclo", async () => {
    const debts = {
      listForProfile: async () => [makeCreditCardDebt({ id: "c1", dueDay: 10 })],
    } as any;
    const acks = {
      listPaidCyclesForUser: async () => [{ debtId: "c1", cycleIso: "2026-06" }],
    } as any;
    const res = await getOverdueDebts(
      { debts, acknowledgements: acks, clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(0);
  });

  it("nao marca vencido quando dueDay ainda nao chegou", async () => {
    const debts = {
      listForProfile: async () => [makeCreditCardDebt({ id: "c1", dueDay: 20 })],
    } as any;
    const acks = { listPaidCyclesForUser: async () => [] } as any;
    const res = await getOverdueDebts(
      { debts, acknowledgements: acks, clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(0);
  });

  it("marca vencido quando dueDay e exatamente hoje (boundary inclusive)", async () => {
    const debts = {
      listForProfile: async () => [makeCreditCardDebt({ id: "c1", dueDay: 15 })],
    } as any;
    const acks = { listPaidCyclesForUser: async () => [] } as any;
    const res = await getOverdueDebts(
      { debts, acknowledgements: acks, clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
  });

  it("recorrente mensal vencido sem ack aparece na lista", async () => {
    const debts = {
      listForProfile: async () => [
        makeRecurringDebt({ id: "r1", dueDay: 8, recurringAmountCents: 9900n }),
      ],
    } as any;
    const acks = { listPaidCyclesForUser: async () => [] } as any;
    const res = await getOverdueDebts(
      { debts, acknowledgements: acks, clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
    expect(res.value[0]!.debtId).toBe("r1");
  });

  it("recorrente com dueDay null usa dia de startDate", async () => {
    const debts = {
      listForProfile: async () => [
        makeRecurringDebt({ id: "r2", dueDay: null, recurringAmountCents: 4900n }),
      ],
    } as any;
    const acks = { listPaidCyclesForUser: async () => [] } as any;
    // startDate = 2026-01-10, so effective dueDay = 10; today = 15 => overdue
    const res = await getOverdueDebts(
      { debts, acknowledgements: acks, clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
  });

  it("retorna lista ordenada por dueDate crescente", async () => {
    const debts = {
      listForProfile: async () => [
        makeCreditCardDebt({ id: "c3", dueDay: 3 }),
        makeCreditCardDebt({ id: "c1", dueDay: 1 }),
        makeCreditCardDebt({ id: "c2", dueDay: 2 }),
      ],
    } as any;
    const acks = { listPaidCyclesForUser: async () => [] } as any;
    const res = await getOverdueDebts(
      { debts, acknowledgements: acks, clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value.map((i) => i.debtId)).toEqual(["c1", "c2", "c3"]);
  });
});
