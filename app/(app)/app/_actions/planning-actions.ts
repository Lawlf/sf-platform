"use server";

import { revalidatePath } from "next/cache";

import { updateGoalCascadeConfig } from "@/application/use-cases/goal/update-goal-cascade-config.use-case";
import { closeMonth } from "@/application/use-cases/month-closing/close-month.use-case";
import {
  settleRecurringCommitment,
  type SettleAction,
} from "@/application/use-cases/month-closing/settle-recurring-commitment.use-case";
import { setLiquidBucket } from "@/application/use-cases/planning/set-liquid-bucket.use-case";
import { createTransaction } from "@/application/use-cases/transaction/create-transaction.use-case";
import type { GoalCascadeMode } from "@/domain/entities/goal.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleExchangeRateRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-exchange-rate.repository";
import { DrizzleFinancialPlanningSettingsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-financial-planning-settings.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleMonthClosingRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-month-closing.repository";
import { DrizzleRecurringSettlementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-recurring-settlement.repository";
import { DrizzleTransactionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-transaction.repository";
import { DrizzleUserFxOverrideRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-fx-override.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import type { MonthClosingStatus } from "./planning-queries";

export interface PlanningActionResult {
  ok: boolean;
  message?: string;
}

export interface CloseMonthActionResult {
  ok: boolean;
  message?: string;
  status?: MonthClosingStatus;
  leakAbsFormatted?: string;
}

export async function setLiquidBucketAction(
  assetId: string | null,
): Promise<PlanningActionResult> {
  const user = await requireUser();
  const result = await setLiquidBucket(
    {
      assets: new DrizzleAssetRepository(),
      settings: new DrizzleFinancialPlanningSettingsRepository(),
    },
    { userId: user.id, assetId },
  );
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app");
  return { ok: true };
}

export async function closeMonthAction(): Promise<CloseMonthActionResult> {
  const user = await requireUser();
  const result = await closeMonth(
    {
      closings: new DrizzleMonthClosingRepository(),
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: new DrizzleDebtRepository(),
      incomes: new DrizzleIncomeRepository(),
      payments: new DrizzleDebtPaymentRepository(),
      clock: new SystemClock(),
      rates: new DrizzleExchangeRateRepository(),
      overrides: new DrizzleUserFxOverrideRepository(),
    },
    { userId: user.id },
  );
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/app");
  const leakAbsCents = result.leakCents < 0n ? -result.leakCents : result.leakCents;
  return {
    ok: true,
    status: result.status,
    leakAbsFormatted: Money.fromCents(leakAbsCents).format(),
  };
}

export async function settleRecurringCommitmentAction(
  debtId: string,
  monthIso: string,
  action: SettleAction,
): Promise<PlanningActionResult> {
  const user = await requireUser();
  const result = await settleRecurringCommitment(
    {
      debts: new DrizzleDebtRepository(),
      settlements: new DrizzleRecurringSettlementRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, debtId, monthIso, action },
  );
  if (result._tag === "err") {
    return { ok: false, message: result.error.message };
  }
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app");
  return { ok: true };
}

export async function updateGoalCascadeConfigAction(
  goalId: string,
  config: { mode: GoalCascadeMode; order: number; parallelFraction: number },
): Promise<PlanningActionResult> {
  const user = await requireUser();
  const result = await updateGoalCascadeConfig(
    { goals: new DrizzleGoalRepository() },
    {
      userId: user.id,
      goalId,
      isPro: user.isPro,
      mode: config.mode,
      order: config.order,
      parallelFraction: config.parallelFraction,
    },
  );
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app");
  return { ok: true };
}

export interface CreateTransactionActionInput {
  amountCents: string;
  description: string;
  category?: string | null;
  occurredAtIso?: string | null;
  direction?: "in" | "out";
  accountId?: string | null;
  status?: "paid" | "scheduled";
}

export async function createTransactionAction(
  input: CreateTransactionActionInput,
): Promise<PlanningActionResult> {
  const user = await requireUser();

  const description = input.description.trim();
  if (description.length === 0) {
    return { ok: false, message: "Descreva o gasto." };
  }

  let amountCents: bigint;
  try {
    amountCents = BigInt(input.amountCents);
  } catch {
    return { ok: false, message: "Informe um valor válido." };
  }
  if (amountCents <= 0n) {
    return { ok: false, message: "O valor precisa ser maior que zero." };
  }

  const category = input.category?.trim() ? input.category.trim() : null;

  let occurredAt: Date | null = null;
  if (input.occurredAtIso) {
    const parsed = new Date(input.occurredAtIso);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, message: "Informe uma data válida." };
    }
    occurredAt = parsed;
  }

  await createTransaction(
    {
      transactions: new DrizzleTransactionRepository(),
      assets: new DrizzleAssetRepository(),
      clock: new SystemClock(),
    },
    {
      userId: user.id,
      direction: input.direction ?? "out",
      amount: Money.fromCents(amountCents),
      description,
      category,
      accountId: input.accountId ?? null,
      occurredAt,
      status: input.status ?? "paid",
    },
  );

  revalidatePath("/app/linha-do-tempo/relatorio");
  return { ok: true };
}
