import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";

export interface OnboardingChecklist {
  hasIncome: boolean;
  hasDebt: boolean;
  hasAsset: boolean;
  hasGoal: boolean;
  debtDismissed: boolean;
  goalDismissed: boolean;
}

export interface OnboardingState {
  wizardSeen: boolean;
  tourDismissed: boolean;
  focus: ContentDiagnosticAnswer | null;
  checklist: OnboardingChecklist;
}

export interface OnboardingCounts {
  hasIncome(userId: string): Promise<boolean>;
  hasDebt(userId: string): Promise<boolean>;
  hasAsset(userId: string): Promise<boolean>;
  hasGoal(userId: string): Promise<boolean>;
}

export interface GetOnboardingStateDeps {
  users: UserRepositoryPort;
  profiles: Pick<ProfileRepositoryPort, "findById">;
  counts: OnboardingCounts;
}

export interface GetOnboardingStateInput {
  userId: string;
  profileId: string;
}

export async function getOnboardingState(
  deps: GetOnboardingStateDeps,
  input: GetOnboardingStateInput,
): Promise<OnboardingState> {
  const user = await deps.users.findById(input.userId);
  if (!user) {
    return {
      wizardSeen: false,
      tourDismissed: false,
      focus: null,
      checklist: {
        hasIncome: false,
        hasDebt: false,
        hasAsset: false,
        hasGoal: false,
        debtDismissed: false,
        goalDismissed: false,
      },
    };
  }
  const [hasIncome, hasDebt, hasAsset, hasGoal, profile] = await Promise.all([
    deps.counts.hasIncome(input.userId),
    deps.counts.hasDebt(input.userId),
    deps.counts.hasAsset(input.userId),
    deps.counts.hasGoal(input.userId),
    deps.profiles.findById(input.profileId),
  ]);
  const debtDismissed = profile?.checklistDebtDismissedAt != null;
  const goalDismissed = profile?.checklistGoalDismissedAt != null;
  return {
    wizardSeen: user.onboardingWizardSeenAt !== null,
    tourDismissed: user.homeTourDismissedAt !== null,
    focus: user.contentDiagnosticAnswer,
    checklist: {
      hasIncome,
      hasDebt,
      hasAsset,
      hasGoal,
      debtDismissed,
      goalDismissed,
    },
  };
}
