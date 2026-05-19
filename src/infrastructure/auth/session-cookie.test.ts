import { describe, expect, it } from "vitest";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  buildClearedSessionCookie,
  buildSessionCookie,
} from "./session-cookie";

describe("session-cookie", () => {
  it("buildSessionCookie sets the expected attributes", () => {
    const cookie = buildSessionCookie("abc");
    expect(cookie.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie.value).toBe("abc");
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(cookie.path).toBe("/");
    expect(cookie.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
  });

  it("buildSessionCookie respects custom maxAgeSeconds", () => {
    expect(buildSessionCookie("abc", { maxAgeSeconds: 600 }).maxAge).toBe(600);
  });

  it("buildClearedSessionCookie has empty value and maxAge=0", () => {
    const cookie = buildClearedSessionCookie();
    expect(cookie.value).toBe("");
    expect(cookie.maxAge).toBe(0);
    expect(cookie.name).toBe(SESSION_COOKIE_NAME);
  });

  it("secure flag matches NODE_ENV=production", () => {
    // Default vitest NODE_ENV is "test"; secure must be false.
    expect(buildSessionCookie("abc").secure).toBe(false);
  });
});
