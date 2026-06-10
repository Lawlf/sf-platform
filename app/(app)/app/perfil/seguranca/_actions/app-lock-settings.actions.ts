"use server";

import { hashPin, verifyPin } from "@/infrastructure/auth/pin-hash";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

type R = { ok: boolean; message?: string };
const ALLOWED_TIMEOUTS = new Set([0, 60, 300]);
function validPin(pin: string): boolean { return /^\d{4}$/.test(pin); }

export async function enableAppLockAction(pin: string, timeoutSeconds: number): Promise<R> {
  const user = await requireUser();
  if (!validPin(pin)) return { ok: false, message: "O PIN deve ter 4 dígitos." };
  if (!ALLOWED_TIMEOUTS.has(timeoutSeconds)) return { ok: false, message: "Tempo inválido." };
  const repo = repos.userCredentials;
  await repo.setPin(user.id, await hashPin(pin));
  await repo.setAppLock(user.id, true, timeoutSeconds);
  return { ok: true };
}

export async function setTimeoutAction(timeoutSeconds: number): Promise<R> {
  const user = await requireUser();
  if (!ALLOWED_TIMEOUTS.has(timeoutSeconds)) return { ok: false, message: "Tempo inválido." };
  const repo = repos.userCredentials;
  const cred = await repo.find(user.id);
  await repo.setAppLock(user.id, cred?.appLockEnabled ?? false, timeoutSeconds);
  return { ok: true };
}

export async function changePinAction(currentPin: string, newPin: string): Promise<R> {
  const user = await requireUser();
  if (!validPin(newPin)) return { ok: false, message: "O novo PIN deve ter 4 dígitos." };
  const repo = repos.userCredentials;
  const cred = await repo.find(user.id);
  if (!cred?.pinHash || !(await verifyPin(currentPin, cred.pinHash))) return { ok: false, message: "PIN atual incorreto." };
  await repo.setPin(user.id, await hashPin(newPin));
  return { ok: true };
}

export async function disableAppLockAction(currentPin: string): Promise<R> {
  const user = await requireUser();
  const repo = repos.userCredentials;
  const cred = await repo.find(user.id);
  // An enabled lock always has a PIN (enableAppLockAction sets one); require it to
  // disable so a held session/device can't turn the lock off without the PIN.
  if (!cred?.pinHash) return { ok: false, message: "PIN não configurado." };
  if (!(await verifyPin(currentPin, cred.pinHash))) return { ok: false, message: "PIN incorreto." };
  await repo.setAppLock(user.id, false, cred.appLockTimeout);
  return { ok: true };
}
