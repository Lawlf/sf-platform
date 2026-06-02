import { render } from "@react-email/render";
import { after, NextResponse, type NextRequest } from "next/server";

import { requestMagicLink } from "@/application/use-cases/auth/request-magic-link.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { loadEnv } from "@/infrastructure/config/env";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import {
  MAGIC_LINK_SUBJECT,
  MagicLinkEmail,
} from "@/infrastructure/email/templates/magic-link.email";
import { getClientIp } from "@/infrastructure/http/client-ip";
import { trackPlausibleEvent } from "@/infrastructure/observability/plausible.service";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { UpstashMagicLinkTokenRepository } from "@/infrastructure/persistence/upstash/upstash-magic-link-token.repository";
import { UpstashRateLimiter } from "@/infrastructure/rate-limit/upstash-rate-limiter";
import { requestMagicLinkSchema } from "@/presentation/http/validators/auth.validators";
import { isErr } from "@/shared/errors/result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestMagicLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Entrada inválida." },
      { status: 400 },
    );
  }
  const env = loadEnv();
  const hasher = new WebCryptoHasher();
  const ip = getClientIp(req);
  const ipHash = await hasher.sha256Hex(ip ?? "unknown");
  const userAgent = req.headers.get("user-agent");

  const result = await requestMagicLink(
    {
      users: new DrizzleUserRepository(),
      tokens: new UpstashMagicLinkTokenRepository(),
      hasher,
      random: new WebCryptoRandomGenerator(),
      rateLimit: new UpstashRateLimiter(),
      clock: new SystemClock(),
    },
    { emailRaw: parsed.data.email, ipHash },
  );

  if (isErr(result)) {
    return NextResponse.json(
      { code: result.error.code, message: result.error.message },
      { status: 400 },
    );
  }

  if (result.value.dispatched) {
    const { rawToken, code, email } = result.value;
    after(async () => {
      try {
        const html = await render(
          MagicLinkEmail({ appUrl: env.NEXT_PUBLIC_APP_URL, token: rawToken!, code: code! }),
        );
        await new ResendEmailService().send({
          to: email,
          subject: MAGIC_LINK_SUBJECT,
          html,
          purpose: "auth",
        });
      } catch (err) {
        console.error("[magic-link] email send failed", err);
        void trackPlausibleEvent(
          { name: "magic_link_send_failed" },
          { ip, userAgent },
        );
      }
    });
    void trackPlausibleEvent(
      { name: "magic_link_requested" },
      { ip, userAgent },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
