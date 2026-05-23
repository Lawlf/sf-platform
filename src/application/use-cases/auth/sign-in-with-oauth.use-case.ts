import type { UserEntity } from "@/domain/entities/user.entity";
import { AccountDeactivated, OauthAccountLinkRequiresVerification } from "@/domain/errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { OauthAccountRepository } from "@/domain/ports/repositories/oauth-account.repository";
import type { SessionRepository } from "@/domain/ports/repositories/session.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { OauthProfile } from "@/domain/ports/services/oauth-provider.service";
import type { RandomGenerator } from "@/domain/ports/services/random-generator.service";
import { err, ok, type Result } from "@/shared/errors";

export interface SignInWithOauthDeps {
  users: UserRepository;
  oauthAccounts: OauthAccountRepository;
  sessions: SessionRepository;
  hasher: Hasher;
  random: RandomGenerator;
  clock: Clock;
}

export interface SignInWithOauthInput {
  profile: OauthProfile;
  ip: string | null;
  userAgent: string | null;
}

export interface SignInWithOauthSuccess {
  user: UserEntity;
  rawSessionId: string;
  sessionExpiresAt: Date;
}

export type SignInWithOauthError = AccountDeactivated | OauthAccountLinkRequiresVerification;

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function signInWithOauth(
  deps: SignInWithOauthDeps,
  input: SignInWithOauthInput,
): Promise<Result<SignInWithOauthSuccess, SignInWithOauthError>> {
  const { profile } = input;
  let user: UserEntity | null = null;

  const existingAccount = await deps.oauthAccounts.findByProviderAndId(
    profile.provider,
    profile.providerUserId,
  );

  if (existingAccount) {
    user = await deps.users.findById(existingAccount.userId);
    if (!user) {
      user = null;
    }
  }

  if (!user) {
    const byEmail = await deps.users.findByEmail(profile.email);
    if (byEmail) {
      if (!profile.emailVerified || !byEmail.emailVerifiedAt) {
        return err(
          new OauthAccountLinkRequiresVerification(
            "Ja existe uma conta com este email. Entre com o magic link para vincular este provedor.",
          ),
        );
      }
      user = byEmail;
      await deps.oauthAccounts.create({
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      });
    } else {
      user = await deps.users.create({
        email: profile.email,
        emailVerified: profile.emailVerified,
        displayName: profile.displayName,
      });
      await deps.oauthAccounts.create({
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      });
    }
  }

  if (user.deactivatedAt) {
    return err(new AccountDeactivated("Conta desativada. Fale com o suporte para reativar."));
  }
  if (!user.emailVerifiedAt && profile.emailVerified) {
    await deps.users.markEmailVerified(user.id);
  }

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
