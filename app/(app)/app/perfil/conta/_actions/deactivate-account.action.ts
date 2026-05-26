"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { deactivateAccount } from "@/application/use-cases/account/deactivate-account.use-case";
import { buildClearedSessionCookie } from "@/infrastructure/auth/session-cookie";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isUserSteppedUp } from "@/presentation/http/middleware/require-user-stepup";

export type DeactivateAccountResult =
  | { ok: true }
  | { ok: false; code?: string; message?: string };

export async function deactivateAccountAction(formData: FormData): Promise<DeactivateAccountResult> {
  const user = await requireUser();
  if (!(await isUserSteppedUp(user.id))) {
    return { ok: false, code: "STEPUP_REQUIRED" as const, message: "Confirme sua identidade para continuar." };
  }
  const reason = (formData.get("reason")?.toString() ?? "").trim() || null;
  await deactivateAccount(
    {
      users: new DrizzleUserRepository(),
      sessions: new DrizzleSessionRepository(),
    },
    { userId: user.id, reason },
  );
  void trackPlausibleEvent({ name: "account_deactivated" });
  const cookieStore = await cookies();
  cookieStore.set(buildClearedSessionCookie());
  redirect("/entrar?error=account_deactivated_self");
}
