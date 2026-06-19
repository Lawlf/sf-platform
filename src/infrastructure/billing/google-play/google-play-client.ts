import { importPKCS8, SignJWT } from "jose";

import { type GooglePlayConfig, requireGooglePlayConfig } from "@/infrastructure/config/env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ANDROIDPUBLISHER = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";

export type SubscriptionState =
  | "SUBSCRIPTION_STATE_UNSPECIFIED"
  | "SUBSCRIPTION_STATE_PENDING"
  | "SUBSCRIPTION_STATE_ACTIVE"
  | "SUBSCRIPTION_STATE_PAUSED"
  | "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
  | "SUBSCRIPTION_STATE_ON_HOLD"
  | "SUBSCRIPTION_STATE_CANCELED"
  | "SUBSCRIPTION_STATE_EXPIRED";

export interface SubscriptionPurchaseV2 {
  subscriptionState: SubscriptionState;
  startTime?: string;
  latestOrderId?: string;
  linkedPurchaseToken?: string;
  acknowledgementState?: "ACKNOWLEDGEMENT_STATE_PENDING" | "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
  }>;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(config: GooglePlayConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;

  const key = await importPKCS8(config.privateKey, "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.serviceAccountEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: now + json.expires_in * 1000 };
  return json.access_token;
}

export class GooglePlayClient {
  constructor(private readonly config: GooglePlayConfig = requireGooglePlayConfig()) {}

  async getSubscriptionV2(purchaseToken: string): Promise<SubscriptionPurchaseV2> {
    const token = await getAccessToken(this.config);
    const url = `${ANDROIDPUBLISHER}/applications/${this.config.packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Play getSubscriptionV2 failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as SubscriptionPurchaseV2;
  }

  async acknowledge(sku: string, purchaseToken: string): Promise<void> {
    const token = await getAccessToken(this.config);
    const url = `${ANDROIDPUBLISHER}/applications/${this.config.packageName}/purchases/subscriptions/${encodeURIComponent(sku)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok && res.status !== 410) {
      throw new Error(`Play acknowledge failed: ${res.status} ${await res.text()}`);
    }
  }
}
