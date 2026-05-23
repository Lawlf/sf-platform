import type { Metadata, Route } from "next";

import { DrizzleNotificationPreferencesRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification-preferences.repository";
import { DrizzlePushSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-push-subscription.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import { NotificationSettings } from "./_components/notification-settings.client";

export const metadata: Metadata = { title: "Notificações" };

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export default async function NotificacoesPage() {
  const user = await requireUser();

  const [prefs, subs] = await Promise.all([
    new DrizzleNotificationPreferencesRepository().findForUser(user.id),
    user.isPro
      ? new DrizzlePushSubscriptionRepository().listForUser(user.id)
      : Promise.resolve([]),
  ]);

  const initialPrefs = prefs ?? {
    userId: user.id,
    pushEnabled: true,
    emailEnabled: true,
    debtDueEnabled: true,
    assetPriceEnabled: true,
    monthlySummaryEnabled: true,
    promotionsEnabled: true,
    newsEnabled: true,
    newsletterEnabled: true,
    updatedAt: new Date(),
  };

  return (
    <PageShell
      title="Notificações"
      description="Escolha o que quer receber e onde."
      backHref={"/app/configuracoes" as Route}
    >
      <NotificationSettings
        isPro={user.isPro}
        vapidPublicKey={VAPID_PUBLIC_KEY}
        initialPrefs={{
          pushEnabled: initialPrefs.pushEnabled,
          emailEnabled: initialPrefs.emailEnabled,
          debtDueEnabled: initialPrefs.debtDueEnabled,
          assetPriceEnabled: initialPrefs.assetPriceEnabled,
          monthlySummaryEnabled: initialPrefs.monthlySummaryEnabled,
          promotionsEnabled: initialPrefs.promotionsEnabled,
          newsEnabled: initialPrefs.newsEnabled,
          newsletterEnabled: initialPrefs.newsletterEnabled,
        }}
        deviceCount={subs.length}
      />
    </PageShell>
  );
}
