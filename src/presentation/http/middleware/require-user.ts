import type { Route } from "next";
import { redirect } from "next/navigation";

import type { UserEntity } from "@/domain/entities/user.entity";

import { loadCurrentUser, type CurrentUserDeps } from "./current-user";

const SIGN_IN_ROUTE = "/entrar";
// /nao-encontrado is not yet declared in the typed routes table; cast through Route until the page exists.
const NOT_FOUND_ROUTE = "/nao-encontrado" as Route;

export async function requireUser(deps: CurrentUserDeps): Promise<UserEntity> {
  const user = await loadCurrentUser(deps);
  if (!user) redirect(SIGN_IN_ROUTE);
  return user;
}

export async function requireAdmin(deps: CurrentUserDeps): Promise<UserEntity> {
  const user = await requireUser(deps);
  if (user.role !== "admin") {
    // 404 instead of 403 to avoid enumeration of admin routes.
    redirect(NOT_FOUND_ROUTE);
  }
  return user;
}
