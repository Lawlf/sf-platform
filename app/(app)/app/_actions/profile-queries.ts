"use server";

import type { ProfileType } from "@/domain/entities/profile.entity";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

export interface SerializedProfile {
  id: string;
  type: ProfileType;
  displayName: string | null;
  linkedProfileId: string | null;
}

export interface ProfilesPayload {
  profiles: SerializedProfile[];
  activeProfileId: string;
}

export async function fetchUserProfiles(): Promise<ProfilesPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profiles, activeProfileId] = await Promise.all([
    repos.profiles.listForUser(user.id),
    getActiveProfileId(),
  ]);

  return {
    profiles: profiles.map((p) => ({
      id: p.id,
      type: p.type,
      displayName: p.displayName,
      linkedProfileId: p.linkedProfileId,
    })),
    activeProfileId,
  };
}
