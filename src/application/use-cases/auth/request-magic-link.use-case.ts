import { render } from "@react-email/render";

import { AccountDeactivated, RateLimited } from "@/domain/errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { MagicLinkTokenRepository } from "@/domain/ports/repositories/magic-link-token.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { RandomGenerator } from "@/domain/ports/services/random-generator.service";
import type { RateLimiter } from "@/domain/ports/services/rate-limiter.service";
import { Email, type InvalidEmailError } from "@/domain/value-objects/email.vo";
import { MagicLinkEmail } from "@/infrastructure/email/templates/magic-link.email";
import { err, ok, type Result } from "@/shared/errors";

export interface RequestMagicLinkDeps {
  users: UserRepository;
  tokens: MagicLinkTokenRepository;
  email: EmailService;
  hasher: Hasher;
  random: RandomGenerator;
  rateLimit: RateLimiter;
  clock: Clock;
  appUrl: string;
}

export interface RequestMagicLinkInput {
  emailRaw: string;
  ipHash: string;
}

export type RequestMagicLinkError = InvalidEmailError | RateLimited | AccountDeactivated;

export async function requestMagicLink(
  deps: RequestMagicLinkDeps,
  input: RequestMagicLinkInput,
): Promise<Result<{ tokenHash: string; expiresAt: Date }, RequestMagicLinkError>> {
  const emailResult = Email.from(input.emailRaw);
  if (!emailResult.ok) return err(emailResult.error);
  const email = emailResult.value;

  const byEmail = await deps.rateLimit.check(`magic-link:email:${email.toString()}`, {
    window: "1 h",
    max: 3,
  });
  if (!byEmail.ok) {
    return err(new RateLimited("Muitas tentativas com este email. Tente em alguns minutos."));
  }
  const byIp = await deps.rateLimit.check(`magic-link:ip:${input.ipHash}`, {
    window: "1 h",
    max: 10,
  });
  if (!byIp.ok) {
    return err(new RateLimited("Muitas tentativas deste dispositivo."));
  }

  const existing = await deps.users.findByEmail(email.toString());
  if (existing && existing.deactivatedAt) {
    return err(new AccountDeactivated("Conta desativada. Fale com o suporte para reativar."));
  }

  const rawToken = deps.random.urlToken();
  const code = deps.random.sixDigitCode();
  const tokenHash = await deps.hasher.sha256Hex(rawToken);
  const expiresAt = new Date(deps.clock.now().getTime() + 15 * 60 * 1000);
  await deps.tokens.create({
    tokenHash,
    code,
    email: email.toString(),
    userId: existing?.id ?? null,
    expiresAt,
  });

  const html = await render(MagicLinkEmail({ appUrl: deps.appUrl, token: rawToken, code }));
  await deps.email.send({
    to: email.toString(),
    subject: "Seu codigo de acesso ao Sabor Financeiro",
    html,
  });

  return ok({ tokenHash, expiresAt });
}
