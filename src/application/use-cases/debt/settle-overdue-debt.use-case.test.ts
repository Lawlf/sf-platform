import { describe, expect, it, vi } from "vitest";

import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type {
  CreditCardDebt,
  DebtEntity,
  RecurringDebt,
} from "@/domain/entities/debt.entity";
import type { DebtDueAcknowledgementRepositoryPort } from "@/domain/ports/repositories/debt-due-acknowledgement.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { DistributedLock } from "@/domain/ports/services/distributed-lock.service";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { settleOverdueDebt } from "./settle-overdue-debt.use-case";

function money(cents: bigint): Money {
  return Money.fromCents(cents);
}

const base = {
  userId: "u1",
  profileId: "p1",
  status: "active" as const,
  startDate: new Date("2026-01-01"),
  expectedEndDate: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  deletedAt: null,
  recurringFrequency: null,
  recurringAmountCents: null,
  expenseCategory: null,
};

function creditCard(balance: bigint, statement: bigint): CreditCardDebt {
  return {
    ...base,
    id: "cc1",
    label: "Cartão",
    kind: "credit_card",
    originalPrincipal: money(balance),
    currentBalance: money(balance),
    creditLimit: null,
    statementDay: 5,
    dueDay: 15,
    currentStatement: money(statement),
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [],
  };
}

function recurring(): RecurringDebt {
  return {
    ...base,
    id: "r1",
    label: "Assinatura",
    kind: "recurring",
    originalPrincipal: money(0n),
    currentBalance: money(0n),
    recurringFrequency: "monthly",
    recurringAmountCents: 9900n,
    expenseCategory: "subscriptions",
    dueDay: 8,
  };
}

function makeDebtRepo(initial: DebtEntity): DebtRepositoryPort {
  let current = initial;
  return {
    findById: vi.fn(async (id: string) => (id === current.id ? current : null)),
    listForProfile: vi.fn(async () => [current]),
    create: vi.fn(),
    update: vi.fn(async (d: DebtEntity) => {
      current = d;
      return d;
    }),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
}

function makePaymentsRepo(): DebtPaymentRepositoryPort & {
  created: DebtPaymentEntity[];
} {
  const created: DebtPaymentEntity[] = [];
  return {
    created,
    listForDebt: vi.fn(async () => []),
    listForProfileInRange: vi.fn(async () => []),
    create: vi.fn(async (p: DebtPaymentEntity) => {
      created.push(p);
      return p;
    }),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
  };
}

function makeAckRepo(): DebtDueAcknowledgementRepositoryPort {
  return {
    upsert: vi.fn(),
    findForDebtCycle: vi.fn(async () => null),
    listPaidCyclesForUser: vi.fn(async () => []),
  };
}

const lock: DistributedLock = { run: (_k, _t, fn) => fn() };
const clock = { now: () => new Date("2026-06-20T10:00:00Z") };

const ctx = { userId: "u1", profileId: "p1", cycleIso: "2026-06" };

describe("settleOverdueDebt", () => {
  it("cartão: registra pagamento da fatura e abate saldo", async () => {
    const debts = makeDebtRepo(creditCard(120000n, 30000n));
    const payments = makePaymentsRepo();
    const res = await settleOverdueDebt(
      { debts, payments, acknowledgements: makeAckRepo(), clock, lock },
      { ...ctx, debtId: "cc1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value.outcome).toBe("paid");
    expect(res.value.paidOff).toBe(false);
    expect(res.value.remaining?.toCents()).toBe(90000n);
    expect(payments.created).toHaveLength(1);
    expect(payments.created[0]!.principalPortion.toCents()).toBe(30000n);
    const after = await debts.findById("cc1");
    expect(after!.currentBalance.toCents()).toBe(90000n);
  });

  it("cartão: fatura quita o saldo restante e marca paid_off", async () => {
    const debts = makeDebtRepo(creditCard(30000n, 30000n));
    const payments = makePaymentsRepo();
    const res = await settleOverdueDebt(
      { debts, payments, acknowledgements: makeAckRepo(), clock, lock },
      { ...ctx, debtId: "cc1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value.outcome).toBe("paid");
    expect(res.value.paidOff).toBe(true);
  });

  it("recorrente: só reconhece o ciclo, sem criar pagamento", async () => {
    const debts = makeDebtRepo(recurring());
    const payments = makePaymentsRepo();
    const acks = makeAckRepo();
    const res = await settleOverdueDebt(
      { debts, payments, acknowledgements: acks, clock, lock },
      { ...ctx, debtId: "r1" },
    );
    if (!isOk(res)) throw new Error("expected ok");
    expect(res.value.outcome).toBe("acknowledged");
    expect(payments.created).toHaveLength(0);
    expect(acks.upsert).toHaveBeenCalledTimes(1);
  });
});
