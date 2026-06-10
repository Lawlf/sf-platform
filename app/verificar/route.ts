import { cookies } from "next/headers";
import { after, NextResponse, type NextRequest } from "next/server";

import { verifyMagicLinkByToken } from "@/application/use-cases/auth/verify-magic-link-by-token.use-case";
import { buildSessionCookie } from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { sendWelcomeFreeEmail } from "@/infrastructure/email/send-welcome-free";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { UpstashMagicLinkTokenRepository } from "@/infrastructure/persistence/upstash/upstash-magic-link-token.repository";
import { isErr } from "@/shared/errors/result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const env = loadEnv();
  const token = new URL(req.url).searchParams.get("token");
  const base = env.NEXT_PUBLIC_APP_URL;

  if (!token) {
    return NextResponse.redirect(new URL("/entrar?error=link_invalido", base));
  }

  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent");

  const result = await verifyMagicLinkByToken(
    {
      users: repos.users,
      tokens: new UpstashMagicLinkTokenRepository(),
      sessions: repos.sessions,
      hasher: new WebCryptoHasher(),
      random: new WebCryptoRandomGenerator(),
      clock,
    },
    { rawToken: token, ip, userAgent },
  );

  if (isErr(result)) {
    return NextResponse.redirect(new URL(`/entrar?error=${result.error.code.toLowerCase()}`, base));
  }

  if (result.value.isNewUser) {
    const { id, email, displayName } = result.value.user;
    after(() => sendWelcomeFreeEmail({ userId: id, to: email, displayName, appUrl: base }));
  }

  const cookieStore = await cookies();
  cookieStore.set(buildSessionCookie(result.value.rawSessionId));
  void trackPlausibleEvent(
    { name: "auth_session_started", props: { method: "magic_link" } },
    { ip, userAgent },
  );
  return NextResponse.redirect(new URL("/app", base));
}
