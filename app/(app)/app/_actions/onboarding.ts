"use server";

import { z } from "zod";

import { dismissChecklistItem } from "@/application/use-cases/onboarding/dismiss-checklist-item.use-case";
import { dismissHomeTour } from "@/application/use-cases/onboarding/dismiss-home-tour.use-case";
import {
  getOnboardingState,
  type OnboardingState,
} from "@/application/use-cases/onboarding/get-onboarding-state.use-case";
import { markWizardSeen } from "@/application/use-cases/onboarding/mark-wizard-seen.use-case";
import { setOnboardingFocus } from "@/application/use-cases/onboarding/set-onboarding-focus.use-case";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { action, unwrap } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export async function fetchOnboardingState(): Promise<OnboardingState> {
  const user = await requireUser();
  const profileId = await getActiveProfileId();
  const users = repos.users;
  const incomes = repos.incomes;
  const debts = repos.debts;
  const assets = repos.assets;
  const goals = repos.goals;

  const counts = {
    async hasIncome(_userId: string): Promise<boolean> {
      const list = await incomes.listForProfile(profileId, { onlyActive: true });
      return list.length > 0;
    },
    async hasDebt(_userId: string): Promise<boolean> {
      const list = await debts.listForProfile(profileId, { status: "active" });
      return list.length > 0;
    },
    async hasAsset(_userId: string): Promise<boolean> {
      const list = await assets.findActiveByProfile(profileId);
      return list.length > 0;
    },
    async hasGoal(_userId: string): Promise<boolean> {
      const list = await goals.listForProfile(profileId, { status: "active" });
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

export const dismissChecklistItemAction = action({
  schema: z.enum(["debt", "goal"]),
  revalidates: ["home"],
  handler: async (item, { userId }) => {
    unwrap(await dismissChecklistItem({ users: repos.users }, { userId, item }));
  },
});

export const setOnboardingFocusAction = action({
  schema: z.enum(["pagar-divida", "guardar", "investir", "fechar-mes"]),
  handler: async (focus, { userId }) => {
    unwrap(await setOnboardingFocus({ users: repos.users, clock }, { userId, focus }));
  },
});
