import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserEntity } from "@/domain/entities/user.entity";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";

import { loadCurrentUser } from "./current-user";

const SIGN_IN_ROUTE = "/entrar";
const NOT_FOUND_ROUTE = "/nao-encontrado" as Route;

export const getCurrentUser = cache(async (): Promise<UserEntity | null> => {
  return loadCurrentUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });
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
