import webpush from "web-push";

import type {
  PushPayload,
  PushSendResult,
  PushService,
  PushTarget,
} from "@/domain/ports/services/push.service";

export interface WebPushConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export class WebPushService implements PushService {
  private configured = false;

  constructor(private readonly config: WebPushConfig) {}

  private ensureConfigured(): void {
    if (this.configured) return;
    webpush.setVapidDetails(this.config.subject, this.config.publicKey, this.config.privateKey);
    this.configured = true;
  }

  async send(target: PushTarget, payload: PushPayload): Promise<PushSendResult> {
    this.ensureConfigured();
    try {
      await webpush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 },
      );
      return { status: "ok" };
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        return { status: "gone" };
      }
      const message = err instanceof Error ? err.message : String(err);
      return { status: "error", message };
    }
  }
}

let cachedService: WebPushService | null = null;

export function getWebPushService(): WebPushService {
  if (cachedService) return cachedService;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "VAPID env vars missing. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.",
    );
  }
  cachedService = new WebPushService({ publicKey, privateKey, subject });
  return cachedService;
}
