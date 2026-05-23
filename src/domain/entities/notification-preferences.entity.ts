/**
 * Preferências de notificação por usuário. `pushEnabled` é master switch.
 * Os demais campos controlam tipos específicos. Default: todos ativos.
 */
export interface NotificationPreferencesEntity {
  userId: string;
  // Masters por canal. Cada canal pode ser silenciado de uma vez.
  pushEnabled: boolean;
  emailEnabled: boolean;
  // Toggles por tipo de notificação. Canais usados por cada tipo são
  // definidos no código (NOTIFICATION_KIND_CHANNELS abaixo).
  debtDueEnabled: boolean;
  assetPriceEnabled: boolean;
  monthlySummaryEnabled: boolean;
  promotionsEnabled: boolean;
  newsEnabled: boolean;
  newsletterEnabled: boolean;
  updatedAt: Date;
}

export type NotificationKindKey =
  | "debtDueEnabled"
  | "assetPriceEnabled"
  | "monthlySummaryEnabled"
  | "promotionsEnabled"
  | "newsEnabled"
  | "newsletterEnabled";

export const NOTIFICATION_KIND_KEYS: ReadonlyArray<NotificationKindKey> = [
  "debtDueEnabled",
  "assetPriceEnabled",
  "monthlySummaryEnabled",
  "promotionsEnabled",
  "newsEnabled",
  "newsletterEnabled",
];

// Tipos liberados pra plano Free. Os demais só funcionam no Pro.
export const FREE_PLAN_NOTIFICATION_KEYS: ReadonlyArray<NotificationKindKey> = [
  "promotionsEnabled",
  "newsEnabled",
  "newsletterEnabled",
];

export type NotificationChannel = "push" | "email";

// Define quais canais cada tipo de notificação usa. O dispatcher percorre os
// canais e checa o master (pushEnabled/emailEnabled) + o toggle por tipo
// antes de enviar.
export const NOTIFICATION_KIND_CHANNELS: Record<
  NotificationKindKey,
  ReadonlyArray<NotificationChannel>
> = {
  debtDueEnabled: ["push", "email"],
  assetPriceEnabled: ["push"],
  monthlySummaryEnabled: ["push", "email"],
  promotionsEnabled: ["email"],
  newsEnabled: ["push", "email"],
  newsletterEnabled: ["email"],
};
