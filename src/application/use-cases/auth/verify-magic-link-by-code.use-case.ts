import type { UserEntity } from "@/domain/entities/user.entity";
import { AccountDeactivated, MagicLinkExpired, MagicLinkInvalid, TooManyAttempts } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { MagicLinkTokenRepositoryPort } from "@/domain/ports/repositories/magic-link-token.repository";
import type { SessionRepositoryPort } from "@/domain/ports/repositories/session.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { RandomGenerator } from "@/domain/ports/services/random-generator.service";
import { Email, type InvalidEmailError } from "@/domain/value-objects/email.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface VerifyMagicLinkByCodeDeps {
  users: UserRepositoryPort;
  tokens: MagicLinkTokenRepositoryPort;
  sessions: SessionRepositoryPort;
  hasher: Hasher;
  random: RandomGenerator;
  clock: Clock;
}

export interface VerifyMagicLinkByCodeInput {
  emailRaw: string;
  code: string;
  ip: string | null;
  userAgent: string | null;
}

export interface VerifyMagicLinkByCodeSuccess {
  user: UserEntity;
  rawSessionId: string;
  sessionExpiresAt: Date;
  isNewUser: boolean;
}

export type VerifyMagicLinkByCodeError =
  | InvalidEmailError
  | MagicLinkInvalid
  | MagicLinkExpired
  | TooManyAttempts
  | AccountDeactivated;

const MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyMagicLinkByCode(
  deps: VerifyMagicLinkByCodeDeps,
  input: VerifyMagicLinkByCodeInput,
): Promise<Result<VerifyMagicLinkByCodeSuccess, VerifyMagicLinkByCodeError>> {
  const emailResult = Email.from(input.emailRaw);
  if (!emailResult.ok) return err(emailResult.error);
  const email = emailResult.value;

  const token = await deps.tokens.findActiveByEmail(email.toString());
  if (!token) return err(new MagicLinkInvalid("Código inválido ou expirado."));
  if (token.attemptCount >= MAX_ATTEMPTS) {
    await deps.tokens.markUsed(token.tokenHash);
    return err(new TooManyAttempts("Limite de tentativas atingido. Solicite um novo código."));
  }
  if (token.expiresAt < deps.clock.now()) return err(new MagicLinkExpired("Código expirado."));

  // Atomic gate: increment BEFORE comparing so concurrent verify calls cannot
  // each pass the N-of-5 check at find time and run constantTimeEqual against
  // the token. Each request reserves an attempt slot via DB-atomic +1.
  const newCount = await deps.tokens.incrementAttempts(token.tokenHash);
  if (newCount > MAX_ATTEMPTS) {
    await deps.tokens.markUsed(token.tokenHash);
    return err(new TooManyAttempts("Limite de tentativas atingido. Solicite um novo código."));
  }

  const inputCodeHash = await deps.hasher.sha256Hex(input.code);
  if (!constantTimeEqual(inputCodeHash, token.code)) {
    if (newCount >= MAX_ATTEMPTS) {
      await deps.tokens.markUsed(token.tokenHash);
      return err(new TooManyAttempts("Limite de tentativas atingido. Solicite um novo código."));
    }
    return err(new MagicLinkInvalid("Código inválido."));
  }

  let user: UserEntity | null = null;
  let isNewUser = false;
  if (token.userId) {
    user = await deps.users.findById(token.userId);
    if (!user) return err(new MagicLinkInvalid("Código inválido."));
  } else {
    const byEmail = await deps.users.findByEmail(token.email);
    if (byEmail) {
      // Race-guard against takeover: token was issued without a userId
      // (no account existed at request time), but in the meantime an account
      // was created via OAuth or another flow. Reject so the attacker who
      // pre-requested a magic link to a victim's address cannot redeem it.
      await deps.tokens.markUsed(token.tokenHash);
      return err(new MagicLinkInvalid("Código inválido."));
    }
    user = await deps.users.create({ email: token.email, emailVerified: true });
    isNewUser = true;
  }
  if (user.deactivatedAt) {
    return err(new AccountDeactivated("Conta desativada. Fale com o suporte para reativar."));
  }
  if (!user.emailVerifiedAt) {
    await deps.users.markEmailVerified(user.id);
  }

  await deps.tokens.markUsed(token.tokenHash);

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

  return ok({ user, rawSessionId, sessionExpiresAt: expiresAt, isNewUser });
}
