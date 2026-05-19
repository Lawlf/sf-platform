import { describe, it, expect } from "vitest";

import { parseEnv } from "./env";

const baseValid = {
  DATABASE_URL: "postgres://u:p@h:5432/db",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  SESSION_COOKIE_SECRET: "a".repeat(32),
};

describe("parseEnv", () => {
  it("parses a minimal valid env", () => {
    const result = parseEnv(baseValid);
    expect(result.DATABASE_URL).toBe(baseValid.DATABASE_URL);
    expect(result.NEXT_PUBLIC_APP_URL).toBe(baseValid.NEXT_PUBLIC_APP_URL);
  });

  it("throws when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _omit, ...rest } = baseValid;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("throws when SESSION_COOKIE_SECRET is too short", () => {
    expect(() => parseEnv({ ...baseValid, SESSION_COOKIE_SECRET: "short" })).toThrow(
      /SESSION_COOKIE_SECRET/,
    );
  });

  it("treats empty strings on optional fields as undefined", () => {
    const result = parseEnv({
      ...baseValid,
      GOOGLE_OAUTH_CLIENT_ID: "",
      RESEND_API_KEY: "",
    });
    expect(result.GOOGLE_OAUTH_CLIENT_ID).toBeUndefined();
    expect(result.RESEND_API_KEY).toBeUndefined();
  });

  it("requires NEXT_PUBLIC_APP_URL to be a URL", () => {
    expect(() => parseEnv({ ...baseValid, NEXT_PUBLIC_APP_URL: "not-a-url" })).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
  });
});
