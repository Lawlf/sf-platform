import type { UserEntity } from "@/domain/entities/user.entity";
import { AccountDeactivated, MagicLinkAlreadyUsed, MagicLinkExpired, MagicLinkInvalid } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { MagicLinkTokenRepository } from "@/domain/ports/repositories/magic-link-token.repository";
import type { SessionRepository } from "@/domain/ports/repositories/session.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { RandomGenerator } from "@/domain/ports/services/random-generator.service";
import { err, ok, type Result } from "@/shared/errors/result";

export interface VerifyMagicLinkByTokenDeps {
  users: UserRepository;
  tokens: MagicLinkTokenRepository;
  sessions: SessionRepository;
  hasher: Hasher;
  random: RandomGenerator;
  clock: Clock;
}

export interface VerifyMagicLinkByTokenInput {
  rawToken: string;
  ip: string | null;
  userAgent: string | null;
}

export interface VerifyMagicLinkByTokenSuccess {
  user: UserEntity;
  rawSessionId: string;
  sessionExpiresAt: Date;
}

export type VerifyMagicLinkByTokenError =
  | MagicLinkInvalid
  | MagicLinkAlreadyUsed
  | MagicLinkExpired
  | AccountDeactivated;

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function verifyMagicLinkByToken(
  deps: VerifyMagicLinkByTokenDeps,
  input: VerifyMagicLinkByTokenInput,
): Promise<Result<VerifyMagicLinkByTokenSuccess, VerifyMagicLinkByTokenError>> {
  const tokenHash = await deps.hasher.sha256Hex(input.rawToken);
  const token = await deps.tokens.findByTokenHash(tokenHash);
  if (!token) return err(new MagicLinkInvalid("Link invalido ou expirado."));
  if (token.usedAt) return err(new MagicLinkAlreadyUsed("Link ja foi utilizado."));
  if (token.expiresAt < deps.clock.now()) return err(new MagicLinkExpired("Link expirado."));

  let user: UserEntity | null = null;
  if (token.userId) {
    user = await deps.users.findById(token.userId);
    if (!user) return err(new MagicLinkInvalid("Link invalido."));
  } else {
    const byEmail = await deps.users.findByEmail(token.email);
    if (byEmail) {
      // Race-guard against takeover: token was issued without a userId
      // (no account existed at request time), but in the meantime an account
      // was created via OAuth or another flow. Reject so an attacker who
      // pre-requested a magic link to a victim's address cannot redeem it.
      await deps.tokens.markUsed(tokenHash);
      return err(new MagicLinkInvalid("Link invalido."));
    }
    user = await deps.users.create({ email: token.email, emailVerified: true });
  }
  if (user.deactivatedAt) {
    return err(new AccountDeactivated("Conta desativada. Fale com o suporte para reativar."));
  }
  if (!user.emailVerifiedAt) {
    await deps.users.markEmailVerified(user.id);
  }

  await deps.tokens.markUsed(tokenHash);

  const rawSessionId = deps.random.urlToken();
  const idHash = await deps.hasher.sha256Hex(rawSessionId);
  const expiresAt = new Date(deps.clock.now().getTime() + SESSION_TTL_MS);
  await deps.sessions.create({
    idHash,
    userId: user.id,
    expiresAt,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return ok({ user, rawSessionId, sessionExpiresAt: expiresAt });
}
