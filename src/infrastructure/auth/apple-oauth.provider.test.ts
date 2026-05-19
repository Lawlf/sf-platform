import { exportPKCS8, generateKeyPair } from "jose";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let pkcs8Pem: string;

beforeAll(async () => {
  const { privateKey } = await generateKeyPair("ES256", { extractable: true });
  pkcs8Pem = await exportPKCS8(privateKey);
});

describe("AppleOauthProvider", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@h:5432/db");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://saborfinanceiro.com.br");
    vi.stubEnv("SESSION_COOKIE_SECRET", "a".repeat(32));
    vi.stubEnv("APPLE_OAUTH_CLIENT_ID", "com.sabor.app");
    vi.stubEnv("APPLE_OAUTH_TEAM_ID", "TEAMID9999");
    vi.stubEnv("APPLE_OAUTH_KEY_ID", "KEYID1234");
    vi.stubEnv("APPLE_OAUTH_PRIVATE_KEY", pkcs8Pem);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("buildAuthUrl assembles all required Apple params (form_post mode)", async () => {
    const { AppleOauthProvider } = await import("./apple-oauth.provider");
    const url = new URL(
      await new AppleOauthProvider().buildAuthUrl({ state: "st", codeChallenge: "ch" }),
    );
    expect(url.origin + url.pathname).toBe("https://appleid.apple.com/auth/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("response_mode")).toBe("form_post");
    expect(url.searchParams.get("client_id")).toBe("com.sabor.app");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://saborfinanceiro.com.br/api/auth/apple/callback",
    );
    expect(url.searchParams.get("scope")).toBe("name email");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("code_challenge")).toBe("ch");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("exchangeCode signs a valid ES256 client_secret JWT", async () => {
    let capturedBody: URLSearchParams | null = null;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedBody = new URLSearchParams(init?.body as string);
      const payload = {
        sub: "apple-abc",
        email: "u@privaterelay.appleid.com",
        email_verified: true,
      };
      const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const idToken = `eyJhbGciOiJFUzI1NiJ9.${b64}.sig`;
      return new Response(JSON.stringify({ id_token: idToken }), { status: 200 });
    });

    const { AppleOauthProvider } = await import("./apple-oauth.provider");
    const profile = await new AppleOauthProvider().exchangeCode({ code: "c", codeVerifier: "v" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(profile.provider).toBe("apple");
    expect(profile.providerUserId).toBe("apple-abc");
    expect(profile.email).toBe("u@privaterelay.appleid.com");
    expect(profile.emailVerified).toBe(true);
    expect(profile.displayName).toBeNull();

    expect(capturedBody).not.toBeNull();
    const cs = capturedBody!.get("client_secret");
    expect(cs).toBeTruthy();
    const parts = cs!.split(".");
    expect(parts.length).toBe(3);
    const header = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf-8"));
    expect(header.alg).toBe("ES256");
    expect(header.kid).toBe("KEYID1234");
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf-8"));
    expect(payload.iss).toBe("TEAMID9999");
    expect(payload.sub).toBe("com.sabor.app");
    expect(payload.aud).toBe("https://appleid.apple.com");
    expect(payload.iat).toBeTypeOf("number");
    expect(payload.exp).toBeTypeOf("number");
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it("handles email_verified returned as the string 'false'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id_token:
            `eyJhbGciOiJFUzI1NiJ9.` +
            Buffer.from(
              JSON.stringify({ sub: "apple-x", email: "u@example.com", email_verified: "false" }),
            ).toString("base64url") +
            `.sig`,
        }),
        { status: 200 },
      ),
    );
    const { AppleOauthProvider } = await import("./apple-oauth.provider");
    const profile = await new AppleOauthProvider().exchangeCode({ code: "c", codeVerifier: "v" });
    expect(profile.emailVerified).toBe(false);
  });

  it("throws when Apple returns non-200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 400 }));
    const { AppleOauthProvider } = await import("./apple-oauth.provider");
    await expect(
      new AppleOauthProvider().exchangeCode({ code: "c", codeVerifier: "v" }),
    ).rejects.toThrow(/Apple token exchange failed/);
  });

  it("throws when id_token is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const { AppleOauthProvider } = await import("./apple-oauth.provider");
    await expect(
      new AppleOauthProvider().exchangeCode({ code: "c", codeVerifier: "v" }),
    ).rejects.toThrow(/missing id_token/);
  });
});
