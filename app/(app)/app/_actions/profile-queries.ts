"use server";

import type { ProfileType } from "@/domain/entities/profile.entity";
import {
  hasLockedProfiles,
  isInGrace,
  isProfileAccessible,
  keptProfileId,
} from "@/domain/services/profile-access.service";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

export interface SerializedProfile {
  id: string;
  type: ProfileType;
  displayName: string | null;
  linkedProfileId: string | null;
  isPrimary: boolean;
  taxClassification: "mei" | "manual" | null;
  // Não acessível no plano atual (Free, fora da graça, e não é o perfil mantido).
  locked: boolean;
}

export interface ProfilesPayload {
  profiles: SerializedProfile[];
  activeProfileId: string;
  isPro: boolean;
  inGrace: boolean;
  graceUntilIso: string | null;
  canCreate: boolean;
  hasLocked: boolean;
  keptProfileId: string | null;
  // Free ainda pode escolher qual perfil fica (na graça, ou se nunca escolheu).
  canChooseKept: boolean;
  // Já confirmou qual perfil fica: encerra o aviso de graça sem esperar os 7 dias.
  choiceMade: boolean;
}

export async function fetchUserProfiles(): Promise<ProfilesPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profiles, activeProfileId] = await Promise.all([
    repos.profiles.listForUser(user.id),
    getActiveProfileId(),
  ]);

  const state = {
    isPro: user.isPro,
    proGraceUntil: user.proGraceUntil,
    freeKeptProfileId: user.freeKeptProfileId,
    now: clock.now(),
  };
  const inGrace = isInGrace(state);

  return {
    profiles: profiles.map((p) => ({
      id: p.id,
      type: p.type,
      displayName: p.displayName,
      linkedProfileId: p.linkedProfileId,
      isPrimary: p.isPrimary,
      taxClassification: p.taxClassification,
      locked: !isProfileAccessible(p.id, profiles, state),
    })),
    activeProfileId,
    isPro: user.isPro,
    inGrace,
    graceUntilIso: user.proGraceUntil ? user.proGraceUntil.toISOString() : null,
    canCreate: user.isPro || profiles.length < 1,
    hasLocked: hasLockedProfiles(profiles, state),
    keptProfileId: keptProfileId(profiles, user.freeKeptProfileId),
    canChooseKept:
      !user.isPro && profiles.length > 1 && inGrace && user.freeKeptProfileId === null,
    choiceMade: user.freeKeptProfileId !== null,
  };
}
