import type { Plan } from "@/domain/entities/plan.entity";
import type { Subscription } from "@/domain/entities/subscription.entity";
import {
  buildProfileBadges,
  resolveSupporterTier,
  type BillingInterval,
  type ProfileBadge,
  type SupporterTier,
} from "@/domain/services/profile-identity.service";

export interface GetProfileIdentityDeps {
  subscriptions: { findActiveByUserId: (userId: string) => Promise<Subscription | null> };
  plans: { findById: (id: string) => Promise<Plan | null> };
}

export interface GetProfileIdentityInput {
  userId: string;
  isPro: boolean;
  isAdmin: boolean;
  flair: string | null;
  consistencyTier: string;
}

export interface ProfileIdentityView {
  supporterTier: SupporterTier;
  badges: ProfileBadge[];
}

export async function getProfileIdentity(
  deps: GetProfileIdentityDeps,
  input: GetProfileIdentityInput,
): Promise<ProfileIdentityView> {
  let billingInterval: BillingInterval | null = null;
  if (input.isPro) {
    const sub = await deps.subscriptions.findActiveByUserId(input.userId);
    if (sub?.planId) {
      const plan = await deps.plans.findById(sub.planId);
      billingInterval = (plan?.billingInterval as BillingInterval | undefined) ?? null;
    }
  }
  const supporterTier = resolveSupporterTier({ isPro: input.isPro, billingInterval });
  const badges = buildProfileBadges({
    supporterTier,
    isAdmin: input.isAdmin,
    flair: input.flair,
    consistencyTier: input.consistencyTier,
  });
  return { supporterTier, badges };
}
