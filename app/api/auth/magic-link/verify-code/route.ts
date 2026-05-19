import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { verifyMagicLinkByCode } from "@/application/use-cases/auth/verify-magic-link-by-code.use-case";
import { buildSessionCookie } from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { DrizzleMagicLinkTokenRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-magic-link-token.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { verifyCodeSchema } from "@/presentation/http/validators/auth.validators";
import { isErr } from "@/shared/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_BY_CODE: Record<string, number> = {
  INVALID_EMAIL: 400,
  MAGIC_LINK_INVALID: 400,
  MAGIC_LINK_EXPIRED: 410,
  TOO_MANY_ATTEMPTS: 429,
  ACCOUNT_DEACTIVATED: 403,
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = verifyCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Entrada invalida." },
      { status: 400 },
    );
  }

  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent");

  const result = await verifyMagicLinkByCode(
    {
      users: new DrizzleUserRepository(),
      tokens: new DrizzleMagicLinkTokenRepository(),
      sessions: new DrizzleSessionRepository(),
      hasher: new WebCryptoHasher(),
      random: new WebCryptoRandomGenerator(),
      clock: new SystemClock(),
    },
    { emailRaw: parsed.data.email, code: parsed.data.code, ip, userAgent },
  );

  if (isErr(result)) {
    return NextResponse.json(
      { code: result.error.code, message: result.error.message },
      { status: STATUS_BY_CODE[result.error.code] ?? 400 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(buildSessionCookie(result.value.rawSessionId));
  void trackPlausibleEvent(
    { name: "auth_session_started", props: { method: "magic_link" } },
    { ip, userAgent },
  );
  return NextResponse.json({ ok: true }, { status: 200 });
}
