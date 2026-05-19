import { importPKCS8, SignJWT } from "jose";

import type { OauthProfile, OauthProvider } from "@/domain/ports/services/oauth-provider.service";
import { loadEnv, requireAppleOauthConfig } from "@/infrastructure/config/env";

const AUTH_URL = "https://appleid.apple.com/auth/authorize";
const TOKEN_URL = "https://appleid.apple.com/auth/token";
const AUDIENCE = "https://appleid.apple.com";

export class AppleOauthProvider implements OauthProvider {
  readonly id = "apple" as const;

  async buildAuthUrl(input: { state: string; codeChallenge: string }): Promise<string> {
    const cfg = requireAppleOauthConfig();
    const env = loadEnv();
    const params = new URLSearchParams({
      response_type: "code",
      response_mode: "form_post",
      client_id: cfg.clientId,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/apple/callback`,
      scope: "name email",
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(input: { code: string; codeVerifier: string }): Promise<OauthProfile> {
    const cfg = requireAppleOauthConfig();
    const env = loadEnv();
    const clientSecret = await this.buildClientSecret();

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: cfg.clientId,
      client_secret: clientSecret,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/apple/callback`,
      code_verifier: input.codeVerifier,
    });
    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Apple token exchange failed: ${resp.status} ${text}`);
    }
    const tokens = (await resp.json()) as { id_token?: string };
    if (!tokens.id_token) {
      throw new Error("Apple token exchange: missing id_token");
    }
    const payload = decodeJwtPayload(tokens.id_token);
    if (typeof payload.sub !== "string") {
      throw new Error("Apple id_token missing sub");
    }
    if (typeof payload.email !== "string") {
      // Apple may omit email on re-auth; we cannot proceed without it.
      throw new Error("Apple id_token missing email");
    }
    const emailVerifiedRaw = payload.email_verified;
    const emailVerified =
      typeof emailVerifiedRaw === "boolean"
        ? emailVerifiedRaw
        : typeof emailVerifiedRaw === "string"
          ? emailVerifiedRaw === "true"
          : true;
    return {
      provider: "apple",
      providerUserId: payload.sub,
      email: payload.email,
      emailVerified,
      displayName: null,
    };
  }

  private async buildClientSecret(): Promise<string> {
    const cfg = requireAppleOauthConfig();
    // Allow env var to embed \n literally; convert to real newlines.
    const pem = cfg.privateKey.replace(/\\n/g, "\n");
    const privateKey = await importPKCS8(pem, "ES256");
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: cfg.keyId })
      .setIssuer(cfg.teamId)
      .setIssuedAt(now)
      .setExpirationTime(now + 60 * 60 * 24 * 30) // 30 days; Apple max is 6 months
      .setAudience(AUDIENCE)
      .setSubject(cfg.clientId)
      .sign(privateKey);
  }
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length < 2 || !parts[1]) throw new Error("Invalid JWT");
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, "base64").toString("utf-8")) as Record<string, unknown>;
}
