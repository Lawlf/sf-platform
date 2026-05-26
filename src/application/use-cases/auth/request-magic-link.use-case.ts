import type { Clock } from "@/domain/ports/clock.port";
import type { MagicLinkTokenRepository } from "@/domain/ports/repositories/magic-link-token.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { RandomGenerator } from "@/domain/ports/services/random-generator.service";
import type { RateLimiter } from "@/domain/ports/services/rate-limiter.service";
import { Email, type InvalidEmailError } from "@/domain/value-objects/email.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RequestMagicLinkDeps {
  users: UserRepository;
  tokens: MagicLinkTokenRepository;
  hasher: Hasher;
  random: RandomGenerator;
  rateLimit: RateLimiter;
  clock: Clock;
}

export interface RequestMagicLinkInput {
  emailRaw: string;
  ipHash: string;
}

export interface RequestMagicLinkSuccess {
  dispatched: boolean;
  tokenHash: string | null;
  expiresAt: Date | null;
  rawToken: string | null;
  code: string | null;
  email: string;
}

export type RequestMagicLinkError = InvalidEmailError;

export async function requestMagicLink(
  deps: RequestMagicLinkDeps,
  input: RequestMagicLinkInput,
): Promise<Result<RequestMagicLinkSuccess, RequestMagicLinkError>> {
  const emailResult = Email.from(input.emailRaw);
  if (!emailResult.ok) return err(emailResult.error);
  const email = emailResult.value;

  const silent = (reason: string): RequestMagicLinkSuccess => {
    console.warn("[magic-link] suppressed dispatch", { reason, email: email.toString() });
    return {
      dispatched: false,
      tokenHash: null,
      expiresAt: null,
      rawToken: null,
      code: null,
      email: email.toString(),
    };
  };

  const byEmail = await deps.rateLimit.check(`magic-link:email:${email.toString()}`, {
    window: "1 h",
    max: 3,
  });
  if (!byEmail.ok) return ok(silent("email-bucket"));

  const byIp = await deps.rateLimit.check(`magic-link:ip:${input.ipHash}`, {
    window: "1 h",
    max: 10,
  });
  if (!byIp.ok) return ok(silent("ip-bucket"));

  const existing = await deps.users.findByEmail(email.toString());
  if (existing && existing.deactivatedAt) return ok(silent("account-deactivated"));

  const rawToken = deps.random.urlToken();
  const code = deps.random.sixDigitCode();
  const tokenHash = await deps.hasher.sha256Hex(rawToken);
  const codeHash = await deps.hasher.sha256Hex(code);
  const expiresAt = new Date(deps.clock.now().getTime() + 15 * 60 * 1000);
  await deps.tokens.create({
    tokenHash,
    code: codeHash,
    email: email.toString(),
    userId: existing?.id ?? null,
    expiresAt,
  });

  return ok({
    dispatched: true,
    tokenHash,
    expiresAt,
    rawToken,
    code,
    email: email.toString(),
  });
}
