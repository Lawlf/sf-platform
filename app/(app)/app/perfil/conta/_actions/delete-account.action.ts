"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { deleteAccount } from "@/application/use-cases/account/delete-account.use-case";
import { buildClearedSessionCookie } from "@/infrastructure/auth/session-cookie";
import { repos } from "@/infrastructure/container";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export type DeleteAccountResult = { ok: false; message: string } | { ok: true };

export async function deleteAccountAction(formData: FormData): Promise<DeleteAccountResult> {
  const user = await requireUser();
  const confirmedEmail = (formData.get("email")?.toString() ?? "").trim().toLowerCase();

  if (confirmedEmail !== user.email.toLowerCase()) {
    return { ok: false, message: "Email não confere. Digite seu email exatamente." };
  }

  await deleteAccount(
    { users: repos.users, sessions: repos.sessions },
    { userId: user.id },
  );

  void trackPlausibleEvent({ name: "account_deleted" });
  const cookieStore = await cookies();
  cookieStore.set(buildClearedSessionCookie());
  redirect("/?conta=excluida");
}
