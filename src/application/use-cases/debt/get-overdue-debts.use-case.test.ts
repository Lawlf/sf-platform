import { describe, expect, it, vi } from "vitest";

import type { CreditCardDebt, DebtEntity, RecurringDebt } from "@/domain/entities/debt.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtDueAcknowledgementRepositoryPort } from "@/domain/ports/repositories/debt-due-acknowledgement.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { getOverdueDebts } from "./get-overdue-debts.use-case";

const fixedClock = (d: Date): Clock => ({ now: () => d });

function makeMoney(cents: bigint): Money {
  return Money.fromCents(cents);
}

function makePaymentsRepo(byDebt: Record<string, Date[]> = {}): DebtPaymentRepositoryPort {
  return {
    listForDebt: vi.fn(async (debtId: string) =>
      (byDebt[debtId] ?? []).map(
        (paidAt) =>
          ({
            id: `pay-${debtId}-${paidAt.getTime()}`,
            debtId,
            paidAt,
            amount: makeMoney(1000n),
            principalPortion: makeMoney(1000n),
            interestPortion: makeMoney(0n),
            isExtra: false,
            isClosingPayment: false,
          }) as DebtPaymentEntity,
      ),
    ),
    listForProfileInRange: vi.fn(async () => []),
    create: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
  };
}

function makeDebtRepo(debts: DebtEntity[]): DebtRepositoryPort {
  return {
    findById: vi.fn(),
    listForProfile: vi.fn(async () => debts),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
}

function makeAckRepo(paid: { debtId: string; cycleIso: string }[] = []): DebtDueAcknowledgementRepositoryPort {
  return {
    upsert: vi.fn(),
    findForDebtCycle: vi.fn(async () => null),
    listPaidCyclesForUser: vi.fn(async () => paid),
  };
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
    const repo = makeDebtRepo([makeCreditCardDebt({ id: "c1", dueDay: 10, currentStatement: 50000n })]);
    const acks = makeAckRepo();
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments: makePaymentsRepo(), clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
    expect(res.value[0]!.debtId).toBe("c1");
    expect(res.value[0]!.cycleIso).toBe("2026-06");
  });

  it("nao marca vencido se ja existe ack paid do ciclo", async () => {
    const repo = makeDebtRepo([makeCreditCardDebt({ id: "c1", dueDay: 10 })]);
    const acks = makeAckRepo([{ debtId: "c1", cycleIso: "2026-06" }]);
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments: makePaymentsRepo(), clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(0);
  });

  it("nao marca vencido quando ja existe pagamento no ciclo", async () => {
    const repo = makeDebtRepo([makeCreditCardDebt({ id: "c1", dueDay: 10 })]);
    const acks = makeAckRepo();
    const payments = makePaymentsRepo({ c1: [new Date(2026, 5, 12)] });
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments, clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(0);
  });

  it("pagamento de outro mes nao limpa o vencido do ciclo atual", async () => {
    const repo = makeDebtRepo([makeCreditCardDebt({ id: "c1", dueDay: 10 })]);
    const acks = makeAckRepo();
    const payments = makePaymentsRepo({ c1: [new Date(2026, 4, 12)] });
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments, clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
  });

  it("nao marca vencido quando dueDay ainda nao chegou", async () => {
    const repo = makeDebtRepo([makeCreditCardDebt({ id: "c1", dueDay: 20 })]);
    const acks = makeAckRepo();
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments: makePaymentsRepo(), clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(0);
  });

  it("marca vencido quando dueDay e exatamente hoje (boundary inclusive)", async () => {
    const repo = makeDebtRepo([makeCreditCardDebt({ id: "c1", dueDay: 15 })]);
    const acks = makeAckRepo();
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments: makePaymentsRepo(), clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
  });

  it("recorrente mensal vencido sem ack aparece na lista", async () => {
    const repo = makeDebtRepo([makeRecurringDebt({ id: "r1", dueDay: 8, recurringAmountCents: 9900n })]);
    const acks = makeAckRepo();
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments: makePaymentsRepo(), clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
    expect(res.value[0]!.debtId).toBe("r1");
  });

  it("recorrente com dueDay null usa dia de startDate", async () => {
    const repo = makeDebtRepo([makeRecurringDebt({ id: "r2", dueDay: null, recurringAmountCents: 4900n })]);
    const acks = makeAckRepo();
    // startDate = 2026-01-10, so effective dueDay = 10; today = 15 => overdue
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments: makePaymentsRepo(), clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
  });

  it("retorna lista ordenada por dueDate crescente", async () => {
    const repo = makeDebtRepo([
      makeCreditCardDebt({ id: "c3", dueDay: 3 }),
      makeCreditCardDebt({ id: "c1", dueDay: 1 }),
      makeCreditCardDebt({ id: "c2", dueDay: 2 }),
    ]);
    const acks = makeAckRepo();
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments: makePaymentsRepo(), clock: fixedClock(new Date(2026, 5, 15)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value.map((i) => i.debtId)).toEqual(["c1", "c2", "c3"]);
  });

  it("recorrente com dueDay=31 em mes de 30 dias usa ultimo dia do mes", async () => {
    // June 2026 has 30 days; dueDay=31 should clamp to 30; now=2026-06-30 => overdue
    const debt = makeRecurringDebt({ id: "r31", dueDay: 31, recurringAmountCents: 5000n });
    const repo = makeDebtRepo([debt]);
    const acks = makeAckRepo();
    const res = await getOverdueDebts(
      { debts: repo, acknowledgements: acks, payments: makePaymentsRepo(), clock: fixedClock(new Date(2026, 5, 30)) },
      { userId: "u1", profileId: "p1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value).toHaveLength(1);
    expect(res.value[0]!.cycleIso).toBe("2026-06");
  });
});
