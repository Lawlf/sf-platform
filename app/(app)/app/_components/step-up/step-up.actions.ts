"use server";

import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";

import { verifyPin } from "@/infrastructure/auth/pin-hash";
import { decryptSecret } from "@/infrastructure/auth/secret-cipher";
import { verifyTotp } from "@/infrastructure/auth/totp";
import { buildUserStepCookie, signUserStepUp, type StepUpFactor } from "@/infrastructure/auth/user-stepup";
import { loadEnv, requireAdminTotpKey } from "@/infrastructure/config/env";
import { repos } from "@/infrastructure/container";
import { UpstashRateLimiter } from "@/infrastructure/rate-limit/upstash-rate-limiter";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

type R = { ok: boolean; message?: string };
const CHALLENGE_COOKIE = "sf_user_step_chal";

function rp() { const url = new URL(loadEnv().NEXT_PUBLIC_APP_URL); return { rpID: url.hostname, origin: url.origin }; }
function parseTransports(raw: string | null): AuthenticatorTransportFuture[] | undefined { return raw ? (raw.split(",") as AuthenticatorTransportFuture[]) : undefined; }

async function grant(userId: string, factor: StepUpFactor): Promise<void> {
  const token = await signUserStepUp(userId, factor, loadEnv().SESSION_COOKIE_SECRET);
  (await cookies()).set(buildUserStepCookie(token));
}

export async function getStepUpFactorsAction(): Promise<{ hasTotp: boolean; hasPasskey: boolean; hasPin: boolean }> {
  const user = await requireUser();
  const repo = repos.userCredentials;
  const [cred, passkeys] = await Promise.all([repo.find(user.id), repo.listWebauthn(user.id)]);
  return { hasTotp: Boolean(cred?.totpSecret), hasPasskey: passkeys.length > 0, hasPin: Boolean(cred?.pinHash) };
}

export async function stepUpPinAction(pin: string): Promise<R> {
  const user = await requireUser();
  const rl = new UpstashRateLimiter();
  if (!(await rl.check(`stepup-pin:${user.id}`, { window: "15 m", max: 10 })).ok) return { ok: false, message: "Muitas tentativas. Aguarde." };
  const cred = await repos.userCredentials.find(user.id);
  if (!cred?.pinHash || !(await verifyPin(pin, cred.pinHash))) return { ok: false, message: "PIN incorreto." };
  await grant(user.id, "pin"); return { ok: true };
}

export async function stepUpTotpAction(code: string): Promise<R> {
  const user = await requireUser();
  const rl = new UpstashRateLimiter();
  if (!(await rl.check(`stepup-totp:${user.id}`, { window: "15 m", max: 10 })).ok) return { ok: false, message: "Muitas tentativas. Aguarde." };
  const cred = await repos.userCredentials.find(user.id);
  if (!cred?.totpSecret) return { ok: false, message: "TOTP não configurado." };
  const secret = decryptSecret(cred.totpSecret, requireAdminTotpKey());
  if (!(await verifyTotp(secret, code, new Date()))) return { ok: false, message: "Código inválido." };
  await grant(user.id, "totp"); return { ok: true };
}

export async function beginStepUpPasskeyAction() {
  const user = await requireUser();
  const { rpID } = rp();
  const creds = await repos.userCredentials.listWebauthn(user.id);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => { const t = parseTransports(c.transports); return t ? { id: c.credentialId, transports: t } : { id: c.credentialId }; }),
    userVerification: "required",
  });
  (await cookies()).set(CHALLENGE_COOKIE, options.challenge, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/app", maxAge: 300 });
  return options;
}

export async function confirmStepUpPasskeyAction(response: AuthenticationResponseJSON): Promise<R> {
  const user = await requireUser();
  const rl = new UpstashRateLimiter();
  if (!(await rl.check(`stepup-passkey:${user.id}`, { window: "15 m", max: 10 })).ok) {
    return { ok: false, message: "Muitas tentativas. Aguarde." };
  }
  const jar = await cookies();
  const expectedChallenge = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  if (!expectedChallenge) return { ok: false, message: "Sessão expirada." };
  const repo = repos.userCredentials;
  const stored = await repo.findWebauthnByCredentialId(response.id);
  if (!stored || stored.userId !== user.id) return { ok: false, message: "Credencial não encontrada." };
  const { rpID, origin } = rp();
  const transports = parseTransports(stored.transports);
  const verification = await verifyAuthenticationResponse({
    response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID,
    credential: { id: stored.credentialId, publicKey: Buffer.from(stored.publicKey, "base64url"), counter: Number(stored.counter), ...(transports ? { transports } : {}) },
  });
  if (!verification.verified) return { ok: false, message: "Falha na verificação." };
  await repo.updateWebauthnCounter(stored.credentialId, BigInt(verification.authenticationInfo.newCounter));
  await grant(user.id, "passkey"); return { ok: true };
}
