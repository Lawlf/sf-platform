import { NextResponse, type NextRequest } from "next/server";

import { requestMagicLink } from "@/application/use-cases/auth/request-magic-link.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { loadEnv } from "@/infrastructure/config/env";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { DrizzleMagicLinkTokenRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-magic-link-token.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { UpstashRateLimiter } from "@/infrastructure/rate-limit/upstash-rate-limiter";
import { requestMagicLinkSchema } from "@/presentation/http/validators/auth.validators";
import { isErr } from "@/shared/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_BY_CODE: Record<string, number> = {
  INVALID_EMAIL: 400,
  RATE_LIMITED: 429,
  ACCOUNT_DEACTIVATED: 403,
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestMagicLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Entrada invalida." },
      { status: 400 },
    );
  }
  const env = loadEnv();
  const hasher = new WebCryptoHasher();
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const ipHash = await hasher.sha256Hex(ip);

  const result = await requestMagicLink(
    {
      users: new DrizzleUserRepository(),
      tokens: new DrizzleMagicLinkTokenRepository(),
      email: new ResendEmailService(),
      hasher,
      random: new WebCryptoRandomGenerator(),
      rateLimit: new UpstashRateLimiter(),
      clock: new SystemClock(),
      appUrl: env.NEXT_PUBLIC_APP_URL,
    },
    { emailRaw: parsed.data.email, ipHash },
  );

  if (isErr(result)) {
    return NextResponse.json(
      { code: result.error.code, message: result.error.message },
      { status: STATUS_BY_CODE[result.error.code] ?? 400 },
    );
  }
  void trackPlausibleEvent(
    { name: "magic_link_requested" },
    { ip, userAgent: req.headers.get("user-agent") },
  );
  return NextResponse.json({ ok: true }, { status: 200 });
}
