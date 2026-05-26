import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { UserEntity } from "@/domain/entities/user.entity";
import { ADMIN_STEP_COOKIE, verifyElevation } from "@/infrastructure/auth/admin-elevation";
import { loadEnv } from "@/infrastructure/config/env";
import { DrizzleUserCredentialsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-credentials.repository";

import { requireAdmin } from "./cached-current-user";

const STEP_UP_ROUTE = "/app/perfil?stepup=admin" as Route;
const ENROLL_ROUTE = "/app/perfil/seguranca" as Route;

/**
 * Non-redirecting elevation check for use inside server actions. Layouts gate
 * page *rendering*; server actions are independently-addressable POST endpoints
 * that never pass through the layout, so every sensitive mutation must assert
 * elevation itself. Returns false when no valid 1h elevation exists for this admin.
 */
export async function isAdminElevated(adminId: string): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_STEP_COOKIE)?.value;
  const elevation = token ? await verifyElevation(token, loadEnv().SESSION_COOKIE_SECRET) : null;
  return Boolean(elevation && elevation.adminId === adminId);
}

/**
 * Requires role=admin AND a valid 1h elevation. Bootstrap exception: an admin
 * with zero enrolled factors is sent to enrollment instead of step-up.
 */
export async function requireElevatedAdmin(_currentPath: string): Promise<UserEntity> {
  const admin = await requireAdmin();

  const creds = new DrizzleUserCredentialsRepository();
  if (!(await creds.hasAnyFactor(admin.id))) redirect(ENROLL_ROUTE);

  if (!(await isAdminElevated(admin.id))) redirect(STEP_UP_ROUTE);

  return admin;
}
