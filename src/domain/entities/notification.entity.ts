/**
 * Tipos de notificacao do sistema. Cada tipo representa um alerta operacional
 * gerado por uma transacao critica (registro de pagamento, arquivamento de
 * divida, reativacao). Novos kinds futuros sao adicionados aqui (por exemplo
 * `large_debt_added`, `payment_overdue`).
 */
export type NotificationKind = "negative_balance_month";

export interface NotificationPayload {
  eyebrow: string;
  line: string;
  iconName: string;
  [key: string]: unknown;
}

/**
 * Notificacao persistida. Diferente das `Stories` da linha do tempo (geradas
 * sob demanda a partir de dados agregados), notificacoes vivem numa tabela
 * propria, podem ser dispensadas pelo usuario (soft delete via `dismissedAt`)
 * e contam para o badge da sidebar.
 */
export interface NotificationEntity {
  id: string;
  userId: string;
  kind: NotificationKind;
  monthIso: string | null;
  triggeredAt: Date;
  payload: NotificationPayload;
  dismissedAt: Date | null;
  createdAt: Date;
}
