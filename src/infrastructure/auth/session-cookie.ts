import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const SESSION_COOKIE_NAME = "sf_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function buildSessionCookie(
  value: string,
  options?: { maxAgeSeconds?: number },
): ResponseCookie {
  const maxAge = options?.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS;
  return {
    name: SESSION_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function buildClearedSessionCookie(): ResponseCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}
