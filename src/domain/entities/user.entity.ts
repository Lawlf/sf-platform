import type { Currency } from "@/domain/value-objects/money.vo";

export type UserRole = "user" | "admin";
export type UserPlan = "free" | "pro";
export type ContentDiagnosticAnswer = "pagar-divida" | "guardar" | "investir" | "fechar-mes";
export type AcquisitionChannel =
  | "founder_direct"
  | "friend_referral"
  | "messaging_group"
  | "influencer"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "free_calculator"
  | "google_search"
  | "dont_remember"
  | "other";

export interface UserEntity {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string | null;
  role: UserRole;
  plan: UserPlan;
  isPro: boolean;
  proGraceUntil: Date | null;
  freeKeptProfileId: string | null;
  deactivatedAt: Date | null;
  deactivationReason: string | null;
  contentDiagnosticAnswer: ContentDiagnosticAnswer | null;
  contentDiagnosticAnsweredAt: Date | null;
  onboardingWizardSeenAt: Date | null;
  homeTourDismissedAt: Date | null;
  acquisitionChannel: AcquisitionChannel | null;
  acquisitionChannelOther: string | null;
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
