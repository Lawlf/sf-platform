"use server";

import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";

import { verifyPin } from "@/infrastructure/auth/pin-hash";
import { loadEnv } from "@/infrastructure/config/env";
import { DrizzleUserCredentialsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-credentials.repository";
import { UpstashRateLimiter } from "@/infrastructure/rate-limit/upstash-rate-limiter";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

type R = { ok: boolean; message?: string };
const CHALLENGE_COOKIE = "sf_applock_chal";

function rp() { const url = new URL(loadEnv().NEXT_PUBLIC_APP_URL); return { rpID: url.hostname, origin: url.origin }; }
function parseTransports(raw: string | null): AuthenticatorTransportFuture[] | undefined { return raw ? (raw.split(",") as AuthenticatorTransportFuture[]) : undefined; }

export async function unlockWithPinAction(pin: string): Promise<R> {
  const user = await requireUser();
  const rl = new UpstashRateLimiter();
  if (!(await rl.check(`applock-pin:${user.id}`, { window: "15 m", max: 10 })).ok) return { ok: false, message: "Muitas tentativas. Aguarde." };
  const cred = await new DrizzleUserCredentialsRepository().find(user.id);
  if (!cred?.pinHash) return { ok: false, message: "PIN não configurado." };
  if (!(await verifyPin(pin, cred.pinHash))) return { ok: false, message: "PIN incorreto." };
  return { ok: true };
}

export async function beginUnlockPasskeyAction() {
  const user = await requireUser();
  const { rpID } = rp();
  const creds = await new DrizzleUserCredentialsRepository().listWebauthn(user.id);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => { const t = parseTransports(c.transports); return t ? { id: c.credentialId, transports: t } : { id: c.credentialId }; }),
    userVerification: "required",
  });
  (await cookies()).set(CHALLENGE_COOKIE, options.challenge, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/app", maxAge: 300 });
  return options;
}

export async function confirmUnlockPasskeyAction(response: AuthenticationResponseJSON): Promise<R> {
  const user = await requireUser();
  const jar = await cookies();
  const expectedChallenge = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  if (!expectedChallenge) return { ok: false, message: "Sessão de verificação expirada." };
  const repo = new DrizzleUserCredentialsRepository();
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
  return { ok: true };
}
