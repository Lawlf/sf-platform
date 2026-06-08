import { describe, it, expect } from "vitest";

import {
  parseEnv,
  requireResendConfig,
  requireUpstashConfig,
  requireGoogleOauthConfig,
  requireR2Config,
} from "./env";

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

describe("require* helpers", () => {
  const fullValid: Record<string, string> = {
    DATABASE_URL: "postgres://u:p@h:5432/db",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    SESSION_COOKIE_SECRET: "a".repeat(32),
    RESEND_API_KEY: "re_test",
    UPSTASH_REDIS_REST_URL: "https://x.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "tk",
    GOOGLE_OAUTH_CLIENT_ID: "g.id",
    GOOGLE_OAUTH_CLIENT_SECRET: "g.secret",
  };

  it("requireResendConfig returns apiKey", () => {
    const env = parseEnv(fullValid);
    expect(requireResendConfig(env)).toEqual({ apiKey: "re_test" });
  });

  it("requireResendConfig throws when RESEND_API_KEY missing", () => {
    const env = parseEnv({ ...fullValid, RESEND_API_KEY: "" });
    expect(() => requireResendConfig(env)).toThrow(/RESEND_API_KEY/);
  });

  it("requireUpstashConfig throws when token missing", () => {
    const env = parseEnv({ ...fullValid, UPSTASH_REDIS_REST_TOKEN: "" });
    expect(() => requireUpstashConfig(env)).toThrow(/UPSTASH_REDIS_REST_TOKEN/);
  });

  it("requireGoogleOauthConfig throws when client id missing", () => {
    const env = parseEnv({ ...fullValid, GOOGLE_OAUTH_CLIENT_ID: "" });
    expect(() => requireGoogleOauthConfig(env)).toThrow(/GOOGLE_OAUTH_CLIENT_ID/);
  });
});

const base = {
  DATABASE_URL: "postgres://x",
  NEXT_PUBLIC_APP_URL: "https://app.test",
  SESSION_COOKIE_SECRET: "x".repeat(32),
};

describe("requireR2Config", () => {
  it("retorna config quando todas as vars R2 estão presentes", () => {
    const env = parseEnv({
      ...base,
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY: "key",
      R2_SECRET: "secret",
      R2_BUCKET: "bucket",
    });
    expect(requireR2Config(env)).toEqual({
      accountId: "acc",
      accessKey: "key",
      secret: "secret",
      bucket: "bucket",
    });
  });

  it("lança quando falta alguma var R2", () => {
    const env = parseEnv({ ...base });
    expect(() => requireR2Config(env)).toThrow(/R2_/);
  });
});
