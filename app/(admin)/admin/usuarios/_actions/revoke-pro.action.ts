"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { revokeProManually } from "@/application/use-cases/billing/revoke-pro-manually.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { loadEnv } from "@/infrastructure/config/env";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import { DrizzleAdminAuditLogRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-admin-audit-log.repository";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireAdmin } from "@/presentation/http/middleware/cached-current-user";
import { isAdminElevated } from "@/presentation/http/middleware/require-elevated-admin";
import { isErr } from "@/shared/errors/result";

import { ADMIN_METRICS_TAG } from "../../_actions/metrics-queries";

import type { ActionResult } from "./grant-pro.action";

export async function revokeProAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!(await isAdminElevated(admin.id)))
    return { ok: false, message: "Elevação necessária. Desbloqueie o painel para continuar." };
  const env = loadEnv();
  const r = await revokeProManually(
    {
      users: new DrizzleUserRepository(),
      subscriptions: new DrizzleSubscriptionRepository(),
      email: new ResendEmailService(),
      clock: new SystemClock(),
      appUrl: env.NEXT_PUBLIC_APP_URL,
    },
    { userId, adminId: admin.id },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  try {
    await new DrizzleAdminAuditLogRepository().record({
      actorId: admin.id,
      action: "pro.revoke",
      targetUserId: userId,
    });
  } catch (e) {
    console.error("[admin] failed to record pro.revoke audit:", e);
  }
  revalidatePath("/admin/usuarios");
  revalidateTag(ADMIN_METRICS_TAG);
  return { ok: true };
}
