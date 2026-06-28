import type { UserEntity } from "@/domain/entities/user.entity";
import { MagicLinkInvalid } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import type { SessionRepositoryPort } from "@/domain/ports/repositories/session.repository";
import type { SubscriptionRepositoryPort } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { RandomGenerator } from "@/domain/ports/services/random-generator.service";
import { Email } from "@/domain/value-objects/email.vo";
import { err, ok, type Result } from "@/shared/errors/result";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LIFETIME_PERIOD_END = new Date("2099-12-31T23:59:59Z");

export interface ReviewerDemoConfig {
  email: string;
  code: string;
}

export interface SignInReviewerDemoDeps {
  users: UserRepositoryPort;
  subscriptions: SubscriptionRepositoryPort;
  profiles: Pick<ProfileRepositoryPort, "ensurePfProfile">;
  sessions: SessionRepositoryPort;
  hasher: Hasher;
  random: RandomGenerator;
  clock: Clock;
}

export interface SignInReviewerDemoInput {
  emailRaw: string;
  code: string;
  ip: string | null;
  userAgent: string | null;
}

export interface SignInReviewerDemoSuccess {
  user: UserEntity;
  rawSessionId: string;
  sessionExpiresAt: Date;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Bypass de login para o revisor da Google Play. O revisor não tem acesso à
 * caixa de entrada do email demo, então o fluxo de magic link normal (código
 * que chega por email, expira em minutos) é inviável. Esta credencial é
 * reutilizável e não expira, como a política da Play exige. Só ativa quando
 * REVIEW_DEMO_EMAIL + REVIEW_DEMO_CODE estão setados no ambiente, e a conta é
 * promovida a Pro para que o revisor veja todos os recursos pagos.
 */
export async function signInReviewerDemo(
  deps: SignInReviewerDemoDeps,
  config: ReviewerDemoConfig,
  input: SignInReviewerDemoInput,
): Promise<Result<SignInReviewerDemoSuccess, MagicLinkInvalid>> {
  const emailMatches = constantTimeEqual(
    input.emailRaw.trim().toLowerCase(),
    config.email.trim().toLowerCase(),
  );
  const codeMatches = constantTimeEqual(input.code, config.code);
  if (!emailMatches || !codeMatches) {
    return err(new MagicLinkInvalid("Código inválido ou expirado."));
  }

  const emailResult = Email.from(config.email);
  if (!emailResult.ok) return err(new MagicLinkInvalid("Código inválido ou expirado."));
  const email = emailResult.value;

  const now = deps.clock.now();
  let user = await deps.users.findByEmail(email.toString());
  if (!user) {
    user = await deps.users.create({ email: email.toString(), emailVerified: true });
  }

  if (!user.isPro || user.plan !== "pro") {
    user = { ...user, isPro: true, plan: "pro", updatedAt: now };
    await deps.users.update(user);
  }

  const activeSub = await deps.subscriptions.findActiveByUserId(user.id);
  if (!activeSub) {
    await deps.subscriptions.save({
      id: crypto.randomUUID(),
      userId: user.id,
      planId: null,
      provider: "manual",
      providerSubscriptionId: null,
      providerCustomerId: null,
      status: "active",
      priceCents: 0n,
      currency: "BRL",
      currentPeriodStart: now,
      currentPeriodEnd: LIFETIME_PERIOD_END,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  await deps.profiles.ensurePfProfile(user.id, now);

  const rawSessionId = deps.random.urlToken();
  const idHash = await deps.hasher.sha256Hex(rawSessionId);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await deps.sessions.create({
    idHash,
    userId: user.id,
    expiresAt,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return ok({ user, rawSessionId, sessionExpiresAt: expiresAt });
}
