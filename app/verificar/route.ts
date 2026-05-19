import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { verifyMagicLinkByToken } from "@/application/use-cases/auth/verify-magic-link-by-token.use-case";
import { buildSessionCookie } from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { loadEnv } from "@/infrastructure/config/env";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { DrizzleMagicLinkTokenRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-magic-link-token.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { isErr } from "@/shared/errors";

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
      users: new DrizzleUserRepository(),
      tokens: new DrizzleMagicLinkTokenRepository(),
      sessions: new DrizzleSessionRepository(),
      hasher: new WebCryptoHasher(),
      random: new WebCryptoRandomGenerator(),
      clock: new SystemClock(),
    },
    { rawToken: token, ip, userAgent },
  );

  if (isErr(result)) {
    return NextResponse.redirect(new URL(`/entrar?error=${result.error.code.toLowerCase()}`, base));
  }

  const cookieStore = await cookies();
  cookieStore.set(buildSessionCookie(result.value.rawSessionId));
  void trackPlausibleEvent(
    { name: "auth_session_started", props: { method: "magic_link" } },
    { ip, userAgent },
  );
  return NextResponse.redirect(new URL("/app", base));
}
