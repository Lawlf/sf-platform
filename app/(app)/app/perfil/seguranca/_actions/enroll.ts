"use server";

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";

import type { UserEntity } from "@/domain/entities/user.entity";
import { encryptSecret } from "@/infrastructure/auth/secret-cipher";
import { generateTotpSecret, totpAuthUri, verifyTotp } from "@/infrastructure/auth/totp";
import { loadEnv, requireAdminTotpKey } from "@/infrastructure/config/env";
import { DrizzleUserCredentialsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-credentials.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isAdminElevated } from "@/presentation/http/middleware/require-elevated-admin";

const CHALLENGE_COOKIE = "sf_webauthn_enroll_chal";

function rp() {
  const url = new URL(loadEnv().NEXT_PUBLIC_APP_URL);
  return { rpID: url.hostname, origin: url.origin, rpName: "Sabor Financeiro" };
}

/**
 * Regular users freely manage their own factors (gated only by an authenticated
 * session). Admins keep the hijack guard: once an admin has a factor, rotating
 * factors requires a fresh elevation, so a stolen admin session cannot silently
 * swap the second factor. Returns an error message when blocked, else null.
 */
async function guardFactorMutation(
  user: UserEntity,
  repo: DrizzleUserCredentialsRepository,
): Promise<string | null> {
  if (user.role !== "admin") return null;
  const hasFactor = await repo.hasAnyFactor(user.id);
  if (hasFactor && !(await isAdminElevated(user.id))) {
    return "Elevação necessária. Abra o painel admin para alterar fatores.";
  }
  return null;
}

export async function beginTotpEnrollAction(): Promise<{ secret: string; uri: string }> {
  const user = await requireUser();
  const secret = generateTotpSecret();
  return { secret, uri: totpAuthUri(secret, user.email) };
}

export async function confirmTotpEnrollAction(
  secret: string,
  code: string,
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const repo = new DrizzleUserCredentialsRepository();
  const blocked = await guardFactorMutation(user, repo);
  if (blocked) return { ok: false, message: blocked };
  if (!(await verifyTotp(secret, code, new Date()))) {
    return { ok: false, message: "Código inválido." };
  }
  await repo.setTotpSecret(user.id, encryptSecret(secret, requireAdminTotpKey()));
  return { ok: true };
}

export async function beginPasskeyEnrollAction() {
  const user = await requireUser();
  const { rpID, rpName } = rp();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  (await cookies()).set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/app",
    maxAge: 300,
  });
  return options;
}

export async function confirmPasskeyEnrollAction(
  response: RegistrationResponseJSON,
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const repo = new DrizzleUserCredentialsRepository();
  const blocked = await guardFactorMutation(user, repo);
  if (blocked) return { ok: false, message: blocked };
  const { rpID, origin } = rp();
  const jar = await cookies();
  const expectedChallenge = jar.get(CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) return { ok: false, message: "Sessão de registro expirada." };

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, message: "Falha ao registrar passkey." };
  }

  const { credential } = verification.registrationInfo;
  await repo.addWebauthn({
    userId: user.id,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: BigInt(credential.counter),
    transports: response.response.transports?.join(",") ?? null,
  });

  jar.delete(CHALLENGE_COOKIE);
  return { ok: true };
}
