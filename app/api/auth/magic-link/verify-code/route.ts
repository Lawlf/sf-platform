import { cookies } from "next/headers";
import { after, NextResponse, type NextRequest } from "next/server";

import { verifyMagicLinkByCode } from "@/application/use-cases/auth/verify-magic-link-by-code.use-case";
import { buildSessionCookie } from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { sendWelcomeFreeEmail } from "@/infrastructure/email/send-welcome-free";
import { getClientIp } from "@/infrastructure/http/client-ip";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { UpstashMagicLinkTokenRepository } from "@/infrastructure/persistence/upstash/upstash-magic-link-token.repository";
import { UpstashRateLimiter } from "@/infrastructure/rate-limit/upstash-rate-limiter";
import { verifyCodeSchema } from "@/presentation/http/validators/auth.validators";
import { isErr } from "@/shared/errors/result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generic invalid for everything that isn't a useful user-facing distinction.
// Avoids enumeration, rate-limit leaks, and lockout signalling.
function genericInvalid() {
  return NextResponse.json(
    { code: "MAGIC_LINK_INVALID", message: "Código inválido ou expirado." },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = verifyCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Entrada inválida." },
      { status: 400 },
    );
  }

  const hasher = new WebCryptoHasher();
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");
  const ipHash = await hasher.sha256Hex(ip ?? "unknown");
  const rateLimit = new UpstashRateLimiter();

  // IP bucket — 20 attempts / 15min
  const ipBucket = await rateLimit.check(`verify-code:ip:${ipHash}`, {
    window: "15 m",
    max: 20,
  });
  if (!ipBucket.ok) {
    console.warn("[verify-code] suppressed", { reason: "ip-bucket", ipHash });
    return genericInvalid();
  }
  // Email bucket — 10 attempts / 15min
  const emailHash = await hasher.sha256Hex(parsed.data.email.toLowerCase());
  const emailBucket = await rateLimit.check(`verify-code:email:${emailHash}`, {
    window: "15 m",
    max: 10,
  });
  if (!emailBucket.ok) {
    console.warn("[verify-code] suppressed", { reason: "email-bucket", emailHash });
    return genericInvalid();
  }

  const result = await verifyMagicLinkByCode(
    {
      users: repos.users,
      tokens: new UpstashMagicLinkTokenRepository(),
      sessions: repos.sessions,
      hasher,
      random: new WebCryptoRandomGenerator(),
      clock,
    },
    { emailRaw: parsed.data.email, code: parsed.data.code, ip, userAgent },
  );

  if (isErr(result)) {
    // Collapse all distinct codes (TOO_MANY_ATTEMPTS, MAGIC_LINK_EXPIRED,
    // ACCOUNT_DEACTIVATED, INVALID_EMAIL) to generic invalid to prevent
    // enumeration of account state. Log the real reason for observability.
    console.warn("[verify-code] failed", { code: result.error.code });
    return genericInvalid();
  }

  if (result.value.isNewUser) {
    const { id, email, displayName } = result.value.user;
    const appUrl = loadEnv().NEXT_PUBLIC_APP_URL;
    after(() => sendWelcomeFreeEmail({ userId: id, to: email, displayName, appUrl }));
  }

  const cookieStore = await cookies();
  cookieStore.set(buildSessionCookie(result.value.rawSessionId));
  void trackPlausibleEvent({ name: "auth_session_started", props: { method: "magic_link" } }, { ip, userAgent });
  return NextResponse.json({ ok: true }, { status: 200 });
}
