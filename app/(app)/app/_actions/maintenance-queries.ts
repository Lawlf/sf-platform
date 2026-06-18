"use server";

import { MaintenancePromptService } from "@/domain/services/maintenance-prompt.service";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

export interface MaintenancePromptPayload {
  assetId: string;
  label: string;
  institution: string | null;
  yieldDescription: string | null;
  lastReviewedAtIso: string | null;
  daysSinceReview: number;
}

export async function fetchMaintenancePrompts(): Promise<MaintenancePromptPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const profileId = await getActiveProfileId();
  const assets = await repos.assets.findActiveByProfile(profileId);
  const items = MaintenancePromptService.computeNeedsReview(assets, new Date());
  return items.map((i) => ({
    assetId: i.assetId,
    label: i.label,
    institution: i.institution ?? null,
    yieldDescription: i.yieldDescription ?? null,
    lastReviewedAtIso: i.lastReviewedAt ? i.lastReviewedAt.toISOString() : null,
    daysSinceReview: i.daysSinceReview,
  }));
}
