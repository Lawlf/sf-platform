export type UserRole = "user" | "admin";
export type UserPlan = "free" | "pro";
export type ContentDiagnosticAnswer = "pagar-divida" | "guardar" | "investir";

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
  quickAccess: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function isActive(user: UserEntity): boolean {
  return user.deactivatedAt === null;
}
