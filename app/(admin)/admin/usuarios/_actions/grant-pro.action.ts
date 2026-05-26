"use server";

import { revalidatePath } from "next/cache";

import { grantProManually, type ProGrant } from "@/application/use-cases/billing/grant-pro-manually.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { loadEnv } from "@/infrastructure/config/env";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import { DrizzlePaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-payment.repository";
import { DrizzlePlanRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-plan.repository";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireAdmin } from "@/presentation/http/middleware/cached-current-user";
import { isAdminElevated } from "@/presentation/http/middleware/require-elevated-admin";
import { isErr } from "@/shared/errors/result";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

const ELEVATION_REQUIRED = "Elevação necessária. Desbloqueie o painel para continuar.";

export async function grantProAction(userId: string, grant: ProGrant): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!(await isAdminElevated(admin.id))) return { ok: false, message: ELEVATION_REQUIRED };
  const env = loadEnv();
  const r = await grantProManually(
    {
      users: new DrizzleUserRepository(),
      subscriptions: new DrizzleSubscriptionRepository(),
      payments: new DrizzlePaymentRepository(),
      plans: new DrizzlePlanRepository(),
      email: new ResendEmailService(),
      clock: new SystemClock(),
      appUrl: env.NEXT_PUBLIC_APP_URL,
    },
    { userId, grant, adminId: admin.id },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  revalidatePath("/admin/usuarios");
  return { ok: true };
}
