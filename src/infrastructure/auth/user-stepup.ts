import { jwtVerify, SignJWT } from "jose";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const USER_STEP_COOKIE = "sf_user_step";
export const USER_STEP_TTL_SECONDS = 300;
export type StepUpFactor = "passkey" | "totp" | "pin";

function keyOf(s: string): Uint8Array { return new TextEncoder().encode(s); }

export async function signUserStepUp(userId: string, factor: StepUpFactor, secret: string): Promise<string> {
  return new SignJWT({ factor }).setProtectedHeader({ alg: "HS256" }).setSubject(userId)
    .setAudience("user-stepup").setIssuedAt().setExpirationTime(`${USER_STEP_TTL_SECONDS}s`).sign(keyOf(secret));
}

export async function verifyUserStepUp(token: string, secret: string): Promise<{ userId: string; factor: StepUpFactor } | null> {
  try {
    const { payload } = await jwtVerify(token, keyOf(secret), { algorithms: ["HS256"], audience: "user-stepup" });
    const f = payload.factor;
    if (typeof payload.sub !== "string") return null;
    if (f !== "passkey" && f !== "totp" && f !== "pin") return null;
    return { userId: payload.sub, factor: f };
  } catch { return null; }
}

export function buildUserStepCookie(token: string): ResponseCookie {
  return { name: USER_STEP_COOKIE, value: token, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/app", maxAge: USER_STEP_TTL_SECONDS };
}
