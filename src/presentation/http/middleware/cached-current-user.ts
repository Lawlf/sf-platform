import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserEntity } from "@/domain/entities/user.entity";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { repos } from "@/infrastructure/container";

import { loadCurrentUser } from "./current-user";

const SIGN_IN_ROUTE = "/entrar";
const NOT_FOUND_ROUTE = "/nao-encontrado" as Route;
const ACTIVITY_THROTTLE_MS = 24 * 60 * 60 * 1000;

export const getCurrentUser = cache(async (): Promise<UserEntity | null> => {
  const now = new Date();
  const user = await loadCurrentUser({
    sessions: repos.sessions,
    users: repos.users,
    hasher: new WebCryptoHasher(),
    now,
  });
  if (user) {
    void repos.userActivity
      .touchLastActive(user.id, now, ACTIVITY_THROTTLE_MS)
      .catch(() => {});
  }
  return user;
});

export const requireUser = cache(async (): Promise<UserEntity> => {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_ROUTE);
  return user;
});

export const requireAdmin = cache(async (): Promise<UserEntity> => {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect(NOT_FOUND_ROUTE);
  }
  return user;
});
