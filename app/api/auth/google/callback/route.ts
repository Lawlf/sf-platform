import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { signInWithOauth } from "@/application/use-cases/auth/sign-in-with-oauth.use-case";
import { GoogleOauthProvider } from "@/infrastructure/auth/google-oauth.provider";
import { buildSessionCookie } from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { loadEnv } from "@/infrastructure/config/env";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { DrizzleOauthAccountRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-oauth-account.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { isErr } from "@/shared/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const env = loadEnv();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const base = env.NEXT_PUBLIC_APP_URL;

  if (errorParam || !code || !state) {
    return NextResponse.redirect(new URL("/entrar?error=oauth_failed", base));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("sf_oauth_state")?.value;
  const codeVerifier = cookieStore.get("sf_oauth_pkce")?.value;

  if (!savedState || !codeVerifier || savedState !== state) {
    return NextResponse.redirect(new URL("/entrar?error=oauth_state_mismatch", base));
  }

  let profile;
  try {
    profile = await new GoogleOauthProvider().exchangeCode({ code, codeVerifier });
  } catch {
    return NextResponse.redirect(new URL("/entrar?error=oauth_failed", base));
  }

  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent");

  const result = await signInWithOauth(
    {
      users: new DrizzleUserRepository(),
      oauthAccounts: new DrizzleOauthAccountRepository(),
      sessions: new DrizzleSessionRepository(),
      hasher: new WebCryptoHasher(),
      random: new WebCryptoRandomGenerator(),
      clock: new SystemClock(),
    },
    { profile, ip, userAgent },
  );

  const response = isErr(result)
    ? NextResponse.redirect(new URL(`/entrar?error=${result.error.code.toLowerCase()}`, base))
    : NextResponse.redirect(new URL("/app", base));
  response.cookies.set({ name: "sf_oauth_state", value: "", path: "/", maxAge: 0 });
  response.cookies.set({ name: "sf_oauth_pkce", value: "", path: "/", maxAge: 0 });

  if (!isErr(result)) {
    response.cookies.set(buildSessionCookie(result.value.rawSessionId));
    void trackPlausibleEvent(
      { name: "auth_session_started", props: { method: "google" } },
      { ip, userAgent },
    );
  }
  return response;
}
