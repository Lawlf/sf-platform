import { jwtVerify, SignJWT } from "jose";

export const ADMIN_STEP_COOKIE = "sf_admin_step";
export const ELEVATION_TTL_SECONDS = 60 * 60; // 1 hour

export type ElevationFactor = "passkey" | "totp";

export interface Elevation {
  adminId: string;
  factor: ElevationFactor;
}

function keyOf(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signElevation(
  adminId: string,
  factor: ElevationFactor,
  secret: string,
): Promise<string> {
  return new SignJWT({ factor })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setAudience("admin-elevation")
    .setIssuedAt()
    .setExpirationTime(`${ELEVATION_TTL_SECONDS}s`)
    .sign(keyOf(secret));
}

export async function verifyElevation(token: string, secret: string): Promise<Elevation | null> {
  try {
    // audience pins this to admin elevation so a user step-up token (same secret,
    // aud "user-stepup") cannot be replayed here to bypass the admin panel gate.
    const { payload } = await jwtVerify(token, keyOf(secret), {
      algorithms: ["HS256"],
      audience: "admin-elevation",
    });
    if (typeof payload.sub !== "string") return null;
    const factor = payload.factor;
    if (factor !== "passkey" && factor !== "totp") return null;
    return { adminId: payload.sub, factor };
  } catch {
    return null;
  }
}

export function buildElevationCookie(token: string) {
  return {
    name: ADMIN_STEP_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ELEVATION_TTL_SECONDS,
  };
}
