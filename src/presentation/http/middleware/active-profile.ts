import { cookies } from "next/headers";
import { cache } from "react";

import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { isProfileAccessible, keptProfileId } from "@/domain/services/profile-access.service";
import { clock, repos } from "@/infrastructure/container";

import { requireUser } from "./cached-current-user";

export const ACTIVE_PROFILE_COOKIE = "sf_active_profile";

interface ResolveArgs {
  userId: string;
  cookieProfileId: string | null;
  now: Date;
  isPro: boolean;
  proGraceUntil: Date | null;
  freeKeptProfileId: string | null;
}

export async function resolveActiveProfileId(
  deps: { profiles: ProfileRepositoryPort },
  args: ResolveArgs,
): Promise<string> {
  const owned = await deps.profiles.listForUser(args.userId);
  let pf = owned.find((p) => p.isPrimary) ?? owned.find((p) => p.type === "PF") ?? null;
  if (!pf) pf = await deps.profiles.ensurePfProfile(args.userId, args.now);

  const state = {
    isPro: args.isPro,
    proGraceUntil: args.proGraceUntil,
    freeKeptProfileId: args.freeKeptProfileId,
    now: args.now,
  };

  // O cookie só vale se o perfil ainda existe E está acessível no plano atual.
  // Senão o Free trancado cairia num perfil que não pode usar.
  if (
    args.cookieProfileId &&
    owned.some((p) => p.id === args.cookieProfileId) &&
    isProfileAccessible(args.cookieProfileId, owned, state)
  ) {
    return args.cookieProfileId;
  }

  return keptProfileId(owned, args.freeKeptProfileId) ?? pf.id;
}

export const getActiveProfileId = cache(async (): Promise<string> => {
  const user = await requireUser();
  const cookieProfileId = (await cookies()).get(ACTIVE_PROFILE_COOKIE)?.value ?? null;
  return resolveActiveProfileId(
    { profiles: repos.profiles },
    {
      userId: user.id,
      cookieProfileId,
      now: clock.now(),
      isPro: user.isPro,
      proGraceUntil: user.proGraceUntil,
      freeKeptProfileId: user.freeKeptProfileId,
    },
  );
});

export async function resolvePfProfileId(userId: string): Promise<string> {
  const user = await repos.users.findById(userId);
  return resolveActiveProfileId(
    { profiles: repos.profiles },
    {
      userId,
      cookieProfileId: null,
      now: clock.now(),
      isPro: user?.isPro ?? false,
      proGraceUntil: user?.proGraceUntil ?? null,
      freeKeptProfileId: user?.freeKeptProfileId ?? null,
    },
  );
}
