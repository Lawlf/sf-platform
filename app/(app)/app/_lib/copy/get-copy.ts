import "server-only";

import { cache } from "react";

import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { makeT, type Catalog, type Ctx } from "./types";

export const getActiveProfileType = cache(async (): Promise<Ctx> => {
  const user = await getCurrentUser();
  if (!user) return "PF";
  const [profiles, activeId] = await Promise.all([
    repos.profiles.listForUser(user.id),
    getActiveProfileId(),
  ]);
  return profiles.find((p) => p.id === activeId)?.type ?? "PF";
});

// Analog server do next-intl: const t = getCopy(catalog, ctx); t("chave").
export function getCopy<C extends Catalog>(catalog: C, ctx: Ctx) {
  return makeT(catalog, ctx);
}
