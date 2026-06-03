"use server";

import { revalidatePath } from "next/cache";

import { dismissHomeTour } from "@/application/use-cases/onboarding/dismiss-home-tour.use-case";
import {
  getOnboardingState,
  type OnboardingState,
} from "@/application/use-cases/onboarding/get-onboarding-state.use-case";
import { markWizardSeen } from "@/application/use-cases/onboarding/mark-wizard-seen.use-case";
import { setOnboardingFocus } from "@/application/use-cases/onboarding/set-onboarding-focus.use-case";
import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { isOk } from "@/shared/errors/result";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export async function fetchOnboardingState(): Promise<OnboardingState> {
  const user = await requireUser();
  const users = new DrizzleUserRepository();
  const incomes = new DrizzleIncomeRepository();
  const debts = new DrizzleDebtRepository();
  const assets = new DrizzleAssetRepository();
  const goals = new DrizzleGoalRepository();

  const counts = {
    async hasIncome(userId: string): Promise<boolean> {
      const list = await incomes.listForUser(userId, { onlyActive: true });
      return list.length > 0;
    },
    async hasDebt(userId: string): Promise<boolean> {
      const list = await debts.listForUser(userId, { status: "active" });
      return list.length > 0;
    },
    async hasAsset(userId: string): Promise<boolean> {
      const list = await assets.findActiveByUser(userId);
      return list.length > 0;
    },
    async hasGoal(userId: string): Promise<boolean> {
      const list = await goals.listForUser(userId, { status: "active" });
      return list.length > 0;
    },
  };

  return getOnboardingState({ users, counts }, { userId: user.id });
}

export async function markWizardSeenAction(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const users = new DrizzleUserRepository();
  const result = await markWizardSeen({ users }, { userId: user.id });
  return { ok: isOk(result) };
}

export async function dismissHomeTourAction(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const users = new DrizzleUserRepository();
  const result = await dismissHomeTour({ users }, { userId: user.id });
  revalidatePath("/app");
  return { ok: isOk(result) };
}

export async function setOnboardingFocusAction(
  focus: ContentDiagnosticAnswer,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const users = new DrizzleUserRepository();
  const clock = new SystemClock();
  const result = await setOnboardingFocus(
    { users, clock },
    { userId: user.id, focus },
  );
  return { ok: isOk(result) };
}
