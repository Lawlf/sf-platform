import { loadEnv } from "@/infrastructure/config/env";

export interface PlausibleEvent {
  name: string;
  props?: Record<string, string | number | boolean | undefined>;
}

/**
 * Fire-and-forget event tracking via Plausible's API.
 *
 * Returns silently if PLAUSIBLE_DOMAIN is not configured. Never throws on
 * the caller's hot path; failures are logged to console.warn.
 *
 * No PII should be passed via props. Use opaque identifiers, kinds, etc.
 */
export async function trackPlausibleEvent(
  event: PlausibleEvent,
  opts?: { ip?: string | null; userAgent?: string | null },
): Promise<void> {
  const env = loadEnv();
  if (!env.PLAUSIBLE_DOMAIN) return;

  const payload = {
    name: event.name,
    domain: env.PLAUSIBLE_DOMAIN,
    url: `https://${env.PLAUSIBLE_DOMAIN}/_event`,
    props: event.props ?? {},
  };

  try {
    await fetch("https://plausible.io/api/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": opts?.userAgent ?? "sabor-financeiro-server",
        "X-Forwarded-For": opts?.ip ?? "127.0.0.1",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn(`plausible event failed: ${(e as Error).message}`);
  }
}
