import type { Currency } from "@/domain/value-objects/money.vo";

export type UserRole = "user" | "admin";
export type UserPlan = "free" | "pro";
export type ContentDiagnosticAnswer = "pagar-divida" | "guardar" | "investir" | "fechar-mes";

export interface UserEntity {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string | null;
  role: UserRole;
  plan: UserPlan;
  isPro: boolean;
  deactivatedAt: Date | null;
  deactivationReason: string | null;
  contentDiagnosticAnswer: ContentDiagnosticAnswer | null;
  contentDiagnosticAnsweredAt: Date | null;
  onboardingWizardSeenAt: Date | null;
  homeTourDismissedAt: Date | null;
  checklistDebtDismissedAt?: Date | null;
  checklistGoalDismissedAt?: Date | null;
  quickAccess: string[];
  username: string | null;
  profileFlair: string | null;
  baseCurrency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export function isActive(user: UserEntity): boolean {
  return user.deactivatedAt === null;
}
