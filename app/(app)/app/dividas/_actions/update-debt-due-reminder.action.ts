"use server";

import { revalidatePath } from "next/cache";

import { normalizeDebtDueDaysBefore } from "@/domain/entities/notification-preferences.entity";
import { DrizzleNotificationPreferencesRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification-preferences.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export type UpdateDebtDueReminderResult = { ok: true } | { ok: false; message: string };

/**
 * Liga/desliga o aviso de vencimento e ajusta a antecedência ("quando avisar"),
 * direto do setor de dívidas. Recurso Pro. Preserva as demais preferências.
 */
export async function updateDebtDueReminderAction(input: {
  enabled: boolean;
  daysBefore: number;
}): Promise<UpdateDebtDueReminderResult> {
  const user = await requireUser();
  if (!user.isPro) {
    return { ok: false, message: "Avisos de vencimento são exclusivos do plano Pro." };
  }

  const repo = new DrizzleNotificationPreferencesRepository();
  const existing = await repo.findForUser(user.id);

  await repo.upsert({
    userId: user.id,
    pushEnabled: existing?.pushEnabled ?? true,
    emailEnabled: existing?.emailEnabled ?? true,
    debtDueEnabled: input.enabled,
    debtDueDaysBefore: normalizeDebtDueDaysBefore(input.daysBefore),
    assetPriceEnabled: existing?.assetPriceEnabled ?? true,
    monthlySummaryEnabled: existing?.monthlySummaryEnabled ?? true,
    promotionsEnabled: existing?.promotionsEnabled ?? true,
    newsEnabled: existing?.newsEnabled ?? true,
    newsletterEnabled: existing?.newsletterEnabled ?? true,
  });

  revalidatePath("/app/dividas");
  revalidatePath("/app/perfil/notificacoes");
  return { ok: true };
}
