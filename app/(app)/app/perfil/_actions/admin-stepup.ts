"use server";

import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";

import { buildElevationCookie, signElevation } from "@/infrastructure/auth/admin-elevation";
import { decryptSecret } from "@/infrastructure/auth/secret-cipher";
import { verifyTotp } from "@/infrastructure/auth/totp";
import { loadEnv, requireAdminTotpKey } from "@/infrastructure/config/env";
import { repos } from "@/infrastructure/container";
import { getAdminStepUpLimiter } from "@/infrastructure/rate-limit/admin-stepup-limiter";
import { requireAdmin } from "@/presentation/http/middleware/cached-current-user";

type R = { ok: boolean; message?: string };

const CHALLENGE_COOKIE = "sf_admin_webauthn_chal";

function rp() {
  const url = new URL(loadEnv().NEXT_PUBLIC_APP_URL);
  return { rpID: url.hostname, origin: url.origin };
}

function parseTransports(raw: string | null): AuthenticatorTransportFuture[] | undefined {
  if (!raw) return undefined;
  return raw.split(",") as AuthenticatorTransportFuture[];
}

async function checkLimit(adminId: string): Promise<boolean> {
  const limiter = getAdminStepUpLimiter();
  if (!limiter) return true;
  const { success } = await limiter.limit(`admin-stepup:${adminId}`);
  return success;
}

async function elevate(adminId: string, factor: "passkey" | "totp"): Promise<void> {
  const token = await signElevation(adminId, factor, loadEnv().SESSION_COOKIE_SECRET);
  (await cookies()).set(buildElevationCookie(token));
}

export async function getAdminFactorsAction(): Promise<{ hasTotp: boolean; hasPasskey: boolean }> {
  const admin = await requireAdmin();
  const repo = repos.userCredentials;
  const [creds, passkeys] = await Promise.all([repo.find(admin.id), repo.listWebauthn(admin.id)]);
  return { hasTotp: Boolean(creds?.totpSecret), hasPasskey: passkeys.length > 0 };
}

export async function verifyTotpStepUpAction(code: string): Promise<R> {
  const admin = await requireAdmin();
  if (!(await checkLimit(admin.id))) return { ok: false, message: "Muitas tentativas. Aguarde." };
  const cred = await repos.userCredentials.find(admin.id);
  if (!cred?.totpSecret) return { ok: false, message: "TOTP não configurado." };
  const secret = decryptSecret(cred.totpSecret, requireAdminTotpKey());
  if (!(await verifyTotp(secret, code, new Date()))) return { ok: false, message: "Código inválido." };
  await elevate(admin.id, "totp");
  return { ok: true };
}

export async function beginPasskeyStepUpAction() {
  const admin = await requireAdmin();
  if (!(await checkLimit(admin.id))) throw new Error("rate-limited");
  const { rpID } = rp();
  const credentials = await repos.userCredentials.listWebauthn(admin.id);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((c) => {
      const transports = parseTransports(c.transports);
      return transports ? { id: c.credentialId, transports } : { id: c.credentialId };
    }),
    userVerification: "required",
  });
  (await cookies()).set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });
  return options;
}

export async function confirmPasskeyStepUpAction(response: AuthenticationResponseJSON): Promise<R> {
  const admin = await requireAdmin();
  if (!(await checkLimit(admin.id))) return { ok: false, message: "Muitas tentativas. Aguarde." };
  const jar = await cookies();
  const expectedChallenge = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  if (!expectedChallenge) return { ok: false, message: "Sessão de verificação expirada." };

  const repo = repos.userCredentials;
  const stored = await repo.findWebauthnByCredentialId(response.id);
  if (!stored || stored.userId !== admin.id) {
    return { ok: false, message: "Credencial não encontrada." };
  }

  const { rpID, origin } = rp();
  const transports = parseTransports(stored.transports);
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: stored.credentialId,
      publicKey: Buffer.from(stored.publicKey, "base64url"),
      counter: Number(stored.counter),
      ...(transports ? { transports } : {}),
    },
  });
  if (!verification.verified) return { ok: false, message: "Falha na verificação da passkey." };

  await repo.updateWebauthnCounter(stored.credentialId, BigInt(verification.authenticationInfo.newCounter));
  await elevate(admin.id, "passkey");
  return { ok: true };
}
