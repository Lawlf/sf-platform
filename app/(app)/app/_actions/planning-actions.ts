"use server";

import { z } from "zod";

import { updateGoalCascadeConfig } from "@/application/use-cases/goal/update-goal-cascade-config.use-case";
import { closeMonth } from "@/application/use-cases/month-closing/close-month.use-case";
import { settleIncome } from "@/application/use-cases/month-closing/settle-income.use-case";
import { settleRecurringCommitment } from "@/application/use-cases/month-closing/settle-recurring-commitment.use-case";
import { setLiquidBucket } from "@/application/use-cases/planning/set-liquid-bucket.use-case";
import { createTransaction } from "@/application/use-cases/transaction/create-transaction.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError, unwrap } from "@/presentation/actions/action";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { computeFreeBalanceEvent, type IncomeFreeBalanceEvent } from "./_free-balance-event";

export const setLiquidBucketAction = action({
  schema: z.string().nullable(),
  revalidates: ["timeline", "home"],
  handler: async (assetId, { userId, profileId }) => {
    const result = await setLiquidBucket(
      {
        assets: repos.assets,
        settings: repos.financialPlanningSettings,
      },
      { userId, profileId, assetId },
    );
    if (!result.ok) throw new ActionError(result.message);
  },
});

export const closeMonthAction = action({
  schema: z.void(),
  revalidates: ["home"],
  handler: async (_input, { userId }) => {
    const profileId = await getActiveProfileId();
    const result = await closeMonth(
      {
        closings: repos.monthClosings,
        assets: repos.assets,
        allocations: repos.assetDebtAllocations,
        debts: repos.debts,
        incomes: repos.incomes,
        payments: repos.debtPayments,
        clock,
        rates: repos.exchangeRates,
        overrides: repos.userFxOverrides,
      },
      { userId, profileId },
    );
    if (!result.ok) throw new ActionError(result.message);
    const leakAbsCents = result.leakCents < 0n ? -result.leakCents : result.leakCents;
    return {
      status: result.status,
      leakAbsFormatted: Money.fromCents(leakAbsCents).format(),
    };
  },
});

const settleRecurringCommitmentSchema = z.object({
  debtId: z.string(),
  monthIso: z.string(),
  action: z.enum(["paid", "convert_to_debt", "cancel"]),
});

export const settleRecurringCommitmentAction = action({
  schema: settleRecurringCommitmentSchema,
  revalidates: ["timeline", "home"],
  handler: async ({ debtId, monthIso, action: settleAction }, { userId, profileId }) => {
    unwrap(
      await settleRecurringCommitment(
        {
          debts: repos.debts,
          settlements: repos.recurringSettlements,
          clock,
        },
        { userId, profileId, debtId, monthIso, action: settleAction },
      ),
    );
  },
});

const settleIncomeSchema = z
  .object({
    incomeId: z.string().min(1),
    monthIso: z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido."),
    status: z.enum(["received", "not_received", "adjusted"]),
    adjustedValueCents: z.coerce.bigint().nonnegative().optional(),
  })
  .refine(
    (v) => v.status !== "adjusted" || (v.adjustedValueCents ?? 0n) > 0n,
    { message: "Informe o valor recebido.", path: ["adjustedValueCents"] },
  );

export const settleIncomeAction = action({
  schema: settleIncomeSchema,
  revalidates: ["timeline", "home"],
  handler: async (input, { userId, profileId }) => {
    unwrap(
      await settleIncome(
        {
          incomes: repos.incomes,
          settlements: repos.incomeSettlements,
          clock,
        },
        {
          userId,
          profileId,
          incomeId: input.incomeId,
          monthIso: input.monthIso,
          action: input.status,
          adjustedAmountCents:
            input.status === "adjusted" ? (input.adjustedValueCents ?? 0n) : null,
        },
      ),
    );
  },
});

const updateGoalCascadeConfigSchema = z.object({
  goalId: z.string(),
  mode: z.enum(["queue", "parallel"]),
  order: z.number(),
  parallelFraction: z.number(),
});

export const updateGoalCascadeConfigAction = action({
  schema: updateGoalCascadeConfigSchema,
  revalidates: ["timeline", "home"],
  handler: async (input, { userId, profileId }) => {
    const user = await requireUser();
    const result = await updateGoalCascadeConfig(
      { goals: repos.goals },
      {
        userId,
        profileId,
        goalId: input.goalId,
        isPro: user.isPro,
        mode: input.mode,
        order: input.order,
        parallelFraction: input.parallelFraction,
      },
    );
    if (!result.ok) throw new ActionError(result.message);
  },
});

const createTransactionSchema = z.object({
  amountCents: z.string(),
  description: z.string(),
  category: z.string().nullable().optional(),
  occurredAtIso: z.string().nullable().optional(),
  direction: z.enum(["in", "out"]).optional(),
  accountId: z.string().nullable().optional(),
  status: z.enum(["paid", "scheduled"]).optional(),
});

export const createTransactionAction = action({
  schema: createTransactionSchema,
  revalidates: ["report"],
  handler: async (input, { userId, profileId }): Promise<{ event: IncomeFreeBalanceEvent | null }> => {
    const description = input.description.trim();
    if (description.length === 0) {
      throw new ActionError("Descreva o gasto.");
    }

    let amountCents: bigint;
    try {
      amountCents = BigInt(input.amountCents);
    } catch {
      throw new ActionError("Informe um valor válido.");
    }
    if (amountCents <= 0n) {
      throw new ActionError("O valor precisa ser maior que zero.");
    }

    const category = input.category?.trim() ? input.category.trim() : null;

    let occurredAt: Date | null = null;
    if (input.occurredAtIso) {
      const parsed = new Date(input.occurredAtIso);
      if (Number.isNaN(parsed.getTime())) {
        throw new ActionError("Informe uma data válida.");
      }
      occurredAt = parsed;
    }

    const direction = input.direction ?? "out";
    const status = input.status ?? "paid";

    await createTransaction(
      {
        transactions: repos.transactions,
        assets: repos.assets,
        clock,
      },
      {
        userId,
        profileId,
        direction,
        amount: Money.fromCents(amountCents),
        description,
        category,
        accountId: input.accountId ?? null,
        occurredAt,
        status,
      },
    );

    const event =
      direction === "in" && status === "paid"
        ? await computeFreeBalanceEvent(userId, profileId, Money.fromCents(amountCents))
        : null;
    return { event };
  },
});
