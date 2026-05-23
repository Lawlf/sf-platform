"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DrizzleNotificationPreferencesRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification-preferences.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const schema = z.object({
  pushEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  debtDueEnabled: z.boolean(),
  assetPriceEnabled: z.boolean(),
  monthlySummaryEnabled: z.boolean(),
  promotionsEnabled: z.boolean(),
  newsEnabled: z.boolean(),
  newsletterEnabled: z.boolean(),
});

export async function updateNotificationPreferencesAction(input: {
  pushEnabled: boolean;
  emailEnabled: boolean;
  debtDueEnabled: boolean;
  assetPriceEnabled: boolean;
  monthlySummaryEnabled: boolean;
  promotionsEnabled: boolean;
  newsEnabled: boolean;
  newsletterEnabled: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }
  const repo = new DrizzleNotificationPreferencesRepository();

  // Plano Free mexe nos toggles básicos (promoções, novidades, newsletter) e
  // no master de email. Tipos Pro + master de push ficam congelados nos
  // valores atuais enquanto o usuário não assina.
  if (!user.isPro) {
    const existing = await repo.findForUser(user.id);
    await repo.upsert({
      userId: user.id,
      pushEnabled: existing?.pushEnabled ?? true,
      emailEnabled: parsed.data.emailEnabled,
      debtDueEnabled: existing?.debtDueEnabled ?? true,
      assetPriceEnabled: existing?.assetPriceEnabled ?? true,
      monthlySummaryEnabled: existing?.monthlySummaryEnabled ?? true,
      promotionsEnabled: parsed.data.promotionsEnabled,
      newsEnabled: parsed.data.newsEnabled,
      newsletterEnabled: parsed.data.newsletterEnabled,
    });
    revalidatePath("/app/perfil/notificacoes");
    return { ok: true };
  }

  await repo.upsert({
    userId: user.id,
    pushEnabled: parsed.data.pushEnabled,
    emailEnabled: parsed.data.emailEnabled,
    debtDueEnabled: parsed.data.debtDueEnabled,
    assetPriceEnabled: parsed.data.assetPriceEnabled,
    monthlySummaryEnabled: parsed.data.monthlySummaryEnabled,
    promotionsEnabled: parsed.data.promotionsEnabled,
    newsEnabled: parsed.data.newsEnabled,
    newsletterEnabled: parsed.data.newsletterEnabled,
  });
  revalidatePath("/app/perfil/notificacoes");
  return { ok: true };
}
