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
  // Antecedência (em dias) do aviso de vencimento de dívida. 0 = no dia.
  // Valores válidos em DEBT_DUE_DAYS_BEFORE_OPTIONS.
  debtDueDaysBefore: number;
  assetPriceEnabled: boolean;
  monthlySummaryEnabled: boolean;
  promotionsEnabled: boolean;
  newsEnabled: boolean;
  newsletterEnabled: boolean;
  updatedAt: Date;
}

// Opções de antecedência oferecidas pro aviso de vencimento. 0 = "no dia".
export const DEBT_DUE_DAYS_BEFORE_OPTIONS: ReadonlyArray<number> = [0, 1, 3, 7];

export const DEBT_DUE_DAYS_BEFORE_DEFAULT = 3;

// Normaliza um valor arbitrário pra uma das opções válidas, caindo no default
// quando fora da lista. Usado na action e na desserialização.
export function normalizeDebtDueDaysBefore(value: number): number {
  return DEBT_DUE_DAYS_BEFORE_OPTIONS.includes(value)
    ? value
    : DEBT_DUE_DAYS_BEFORE_DEFAULT;
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
  debtDueEnabled: ["push"],
  assetPriceEnabled: ["push"],
  monthlySummaryEnabled: ["push", "email"],
  promotionsEnabled: ["email"],
  newsEnabled: ["push", "email"],
  newsletterEnabled: ["email"],
};
