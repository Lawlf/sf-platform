"use server";

import { z } from "zod";

import { dismissHomeTour } from "@/application/use-cases/onboarding/dismiss-home-tour.use-case";
import {
  getOnboardingState,
  type OnboardingState,
} from "@/application/use-cases/onboarding/get-onboarding-state.use-case";
import { markWizardSeen } from "@/application/use-cases/onboarding/mark-wizard-seen.use-case";
import { setOnboardingFocus } from "@/application/use-cases/onboarding/set-onboarding-focus.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export async function fetchOnboardingState(): Promise<OnboardingState> {
  const user = await requireUser();
  const users = repos.users;
  const incomes = repos.incomes;
  const debts = repos.debts;
  const assets = repos.assets;
  const goals = repos.goals;

  const counts = {
    async hasIncome(userId: string): Promise<boolean> {
      const list = await incomes.listForProfile(userId, { onlyActive: true });
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

export const markWizardSeenAction = action({
  schema: z.void(),
  handler: async (_input, { userId }) => {
    unwrap(await markWizardSeen({ users: repos.users }, { userId }));
  },
});

export const dismissHomeTourAction = action({
  schema: z.void(),
  revalidates: ["home"],
  handler: async (_input, { userId }) => {
    unwrap(await dismissHomeTour({ users: repos.users }, { userId }));
  },
});

export const setOnboardingFocusAction = action({
  schema: z.enum(["pagar-divida", "guardar", "investir"]),
  handler: async (focus, { userId }) => {
    unwrap(await setOnboardingFocus({ users: repos.users, clock }, { userId, focus }));
  },
});
