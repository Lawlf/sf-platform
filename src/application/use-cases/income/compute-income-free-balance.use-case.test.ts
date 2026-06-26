import { describe, expect, it } from "vitest";

import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { FinancialPlanningSettingsEntity } from "@/domain/entities/financial-planning-settings.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type {
  FinancialPlanningSettingsRepositoryPort,
  FreeBalanceBucketUpdate,
} from "@/domain/ports/repositories/financial-planning-settings.repository";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import {
  computeIncomeFreeBalance,
  type ComputeIncomeFreeBalanceDeps,
} from "./compute-income-free-balance.use-case";

function fakeSettings(): FinancialPlanningSettingsRepositoryPort {
  let state: FinancialPlanningSettingsEntity | null = null;
  return {
    findByProfile: async () => state,
    upsertLiquidBucket: async () => {
      throw new Error("not used");
    },
    upsertFreeBalanceBucket: async (
      userId: string,
      profileId: string,
      update: FreeBalanceBucketUpdate,
    ) => {
      state = {
        userId,
        profileId,
        liquidBucketAssetId: null,
        freeBalanceAccumulatedCents: update.accumulatedCents,
        committedCoveredCents: update.committedCoveredCents,
        currentBucketMonth: update.currentBucketMonth,
        createdAt: new Date("2026-06-01T00:00:00Z"),
        updatedAt: new Date("2026-06-01T00:00:00Z"),
      };
      return state;
    },
  };
}

const ZERO_MACRO: GoalMacro = {
  investedCents: 0n,
  cashReserveCents: 0n,
  contributionCents: 0n,
  monthlyServiceCents: 0n,
  monthlyIncomeCents: 0n,
  debts: [],
};

function depsWith(
  payments: DebtPaymentEntity[],
  settings: FinancialPlanningSettingsRepositoryPort,
  goals: GoalEntity[] = [],
): ComputeIncomeFreeBalanceDeps {
  return {
    debts: { listForProfile: async () => [] },
    debtPayments: { listForProfileInRange: async () => payments },
    debtAmountAdjustments: { listForProfile: async () => [] },
    recurringSettlements: { listForProfile: async () => [] },
    settings,
    goals: { listForProfile: async () => goals },
    goalMacro: async () => ZERO_MACRO,
    now: () => new Date("2026-06-15T00:00:00Z"),
  } as unknown as ComputeIncomeFreeBalanceDeps;
}

function savingsGoal(): GoalEntity {
  return {
    id: "g1",
    userId: "u1",
    profileId: "p1",
    householdId: null,
    type: "savings",
    title: "Reserva",
    status: "active",
    targetCents: 1_200_000n,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: 12,
    fundingMode: "manual",
    manualSavedCents: 0n,
    monthlyCostCents: null,
    realReturnPct: null,
    cascadeOrder: 0,
    cascadeMode: "queue",
    cascadeParallelPct: null,
    createdAt: new Date("2026-06-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
  };
}

const payment = {
  debtId: "d1",
  amount: Money.fromCents(230000n),
  paidAt: new Date("2026-06-10T00:00:00Z"),
  isClosingPayment: false,
} as unknown as DebtPaymentEntity;

const input = { userId: "u1", profileId: "p1", eventAmount: Money.fromCents(600000n) };

describe("computeIncomeFreeBalance", () => {
  it("usa o comprometido do mês como o que já tem dono e devolve o livre", async () => {
    const result = await computeIncomeFreeBalance(depsWith([payment], fakeSettings()), input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.entrou.toCents()).toBe(600000n);
      expect(result.value.jaTemDono.toCents()).toBe(230000n);
      expect(result.value.livre.toCents()).toBe(370000n);
    }
  });

  it("sem comprometido no mês, a entrada inteira é livre", async () => {
    const result = await computeIncomeFreeBalance(depsWith([], fakeSettings()), input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.jaTemDono.toCents()).toBe(0n);
      expect(result.value.livre.toCents()).toBe(600000n);
    }
  });

  it("soma o aporte das metas priorizadas ao que já tem dono", async () => {
    const result = await computeIncomeFreeBalance(
      depsWith([], fakeSettings(), [savingsGoal()]),
      input,
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.jaTemDono.toCents()).toBe(100000n);
      expect(result.value.livre.toCents()).toBe(500000n);
    }
  });

  it("acumula o balde entre eventos do mês sem abater o comprometido duas vezes", async () => {
    const settings = fakeSettings();
    const deps = depsWith([payment], settings);

    await computeIncomeFreeBalance(deps, input);
    const second = await computeIncomeFreeBalance(deps, {
      userId: "u1",
      profileId: "p1",
      eventAmount: Money.fromCents(200000n),
    });

    expect(isOk(second)).toBe(true);
    if (isOk(second)) {
      expect(second.value.jaTemDono.toCents()).toBe(0n);
      expect(second.value.livre.toCents()).toBe(570000n);
    }
  });
});
