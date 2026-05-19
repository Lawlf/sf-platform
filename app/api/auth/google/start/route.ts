import { NextResponse } from "next/server";

import { GoogleOauthProvider } from "@/infrastructure/auth/google-oauth.provider";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_SECURE = process.env.NODE_ENV === "production";
const COOKIE_MAX_AGE = 600; // 10 minutes for the OAuth roundtrip

export async function GET() {
  const rng = new WebCryptoRandomGenerator();
  const hasher = new WebCryptoHasher();
  const state = rng.urlToken();
  const codeVerifier = rng.urlToken();
  const codeChallenge = await pkceChallenge(codeVerifier, hasher);

  const url = await new GoogleOauthProvider().buildAuthUrl({ state, codeChallenge });
  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: "sf_oauth_state",
    value: state,
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  response.cookies.set({
    name: "sf_oauth_pkce",
    value: codeVerifier,
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

async function pkceChallenge(
  codeVerifier: string,
  hasher: { sha256Hex: (s: string) => Promise<string> },
): Promise<string> {
  const hex = await hasher.sha256Hex(codeVerifier);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return Buffer.from(bytes).toString("base64url");
}
