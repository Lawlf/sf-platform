import { cookies } from "next/headers";
import { cache } from "react";

import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { clock, repos } from "@/infrastructure/container";

import { requireUser } from "./cached-current-user";

export const ACTIVE_PROFILE_COOKIE = "sf_active_profile";

export async function resolveActiveProfileId(
  deps: { profiles: ProfileRepositoryPort },
  args: { userId: string; cookieProfileId: string | null; now: Date },
): Promise<string> {
  const owned = await deps.profiles.listForUser(args.userId);
  let pf = owned.find((p) => p.isPrimary) ?? owned.find((p) => p.type === "PF") ?? null;
  if (!pf) pf = await deps.profiles.ensurePfProfile(args.userId, args.now);

  if (args.cookieProfileId && owned.some((p) => p.id === args.cookieProfileId)) {
    return args.cookieProfileId;
  }
  return pf.id;
}

export const getActiveProfileId = cache(async (): Promise<string> => {
  const user = await requireUser();
  const cookieProfileId = (await cookies()).get(ACTIVE_PROFILE_COOKIE)?.value ?? null;
  return resolveActiveProfileId({ profiles: repos.profiles }, {
    userId: user.id,
    cookieProfileId,
    now: clock.now(),
  });
});

export async function resolvePfProfileId(userId: string): Promise<string> {
  return resolveActiveProfileId(
    { profiles: repos.profiles },
    { userId, cookieProfileId: null, now: clock.now() },
  );
}
