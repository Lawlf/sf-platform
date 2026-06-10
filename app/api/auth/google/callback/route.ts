import { cookies } from "next/headers";
import { after, NextResponse, type NextRequest } from "next/server";

import { signInWithOauth } from "@/application/use-cases/auth/sign-in-with-oauth.use-case";
import { GoogleOauthProvider } from "@/infrastructure/auth/google-oauth.provider";
import { buildSessionCookie } from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { sendWelcomeFreeEmail } from "@/infrastructure/email/send-welcome-free";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { isErr } from "@/shared/errors/result";

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
      users: repos.users,
      oauthAccounts: repos.oauthAccounts,
      sessions: repos.sessions,
      hasher: new WebCryptoHasher(),
      random: new WebCryptoRandomGenerator(),
      clock,
    },
    { profile, ip, userAgent },
  );

  if (isErr(result)) {
    const response = NextResponse.redirect(
      new URL(`/entrar?error=${result.error.code.toLowerCase()}`, base),
    );
    response.cookies.set({ name: "sf_oauth_state", value: "", path: "/", maxAge: 0 });
    response.cookies.set({ name: "sf_oauth_pkce", value: "", path: "/", maxAge: 0 });
    return response;
  }
  if (result.value.isNewUser) {
    const { id, email, displayName } = result.value.user;
    after(() => sendWelcomeFreeEmail({ userId: id, to: email, displayName, appUrl: base }));
  }

  const response = NextResponse.redirect(new URL("/app", base));
  response.cookies.set({ name: "sf_oauth_state", value: "", path: "/", maxAge: 0 });
  response.cookies.set({ name: "sf_oauth_pkce", value: "", path: "/", maxAge: 0 });
  response.cookies.set(buildSessionCookie(result.value.rawSessionId));
  void trackPlausibleEvent({ name: "auth_session_started", props: { method: "google" } }, { ip, userAgent });
  return response;
}
