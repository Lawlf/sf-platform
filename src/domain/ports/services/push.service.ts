export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Resultado de uma tentativa de envio. `gone` indica que o endpoint expirou
 * (410/404) e deve ser removido do banco. `error` é falha transiente; tentar
 * de novo depois.
 */
export type PushSendResult = { status: "ok" } | { status: "gone" } | { status: "error"; message: string };

export interface PushService {
  send(target: PushTarget, payload: PushPayload): Promise<PushSendResult>;
}
