import type { OauthProfile, OauthProvider } from "@/domain/ports/services/oauth-provider.service";
import { loadEnv, requireGoogleOauthConfig } from "@/infrastructure/config/env";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleOauthProvider implements OauthProvider {
  readonly id = "google" as const;

  async buildAuthUrl(input: { state: string; codeChallenge: string }): Promise<string> {
    const cfg = requireGoogleOauthConfig();
    const env = loadEnv();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: cfg.clientId,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      scope: "openid email profile",
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
      access_type: "online",
      prompt: "select_account",
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(input: { code: string; codeVerifier: string }): Promise<OauthProfile> {
    const cfg = requireGoogleOauthConfig();
    const env = loadEnv();
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      code_verifier: input.codeVerifier,
    });
    const tokenResp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokenResp.ok) {
      const text = await tokenResp.text().catch(() => "");
      throw new Error(`Google token exchange failed: ${tokenResp.status} ${text}`);
    }
    const tokens = (await tokenResp.json()) as { id_token?: string };
    if (!tokens.id_token) {
      throw new Error("Google token exchange: missing id_token in response");
    }
    const payload = decodeJwtPayload(tokens.id_token);
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      throw new Error("Google id_token missing required claims");
    }
    return {
      provider: "google",
      providerUserId: payload.sub,
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
      displayName: typeof payload.name === "string" ? payload.name : null,
    };
  }
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length < 2 || !parts[1]) throw new Error("Invalid JWT");
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, "base64").toString("utf-8")) as Record<string, unknown>;
}
