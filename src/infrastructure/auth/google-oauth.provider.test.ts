import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jwtVerifyMock = vi.fn();
const createRemoteJWKSetMock = vi.fn().mockReturnValue({ kid: "fake-jwks" });

vi.mock("jose", () => ({
  createRemoteJWKSet: createRemoteJWKSetMock,
  jwtVerify: jwtVerifyMock,
}));

describe("GoogleOauthProvider", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@h:5432/db");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://saborfinanceiro.com.br");
    vi.stubEnv("SESSION_COOKIE_SECRET", "a".repeat(32));
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "client-secret");
    jwtVerifyMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("buildAuthUrl assembles all required PKCE + scope params", async () => {
    const { GoogleOauthProvider } = await import("./google-oauth.provider");
    const url = new URL(
      await new GoogleOauthProvider().buildAuthUrl({ state: "st", codeChallenge: "ch" }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://saborfinanceiro.com.br/api/auth/google/callback",
    );
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("code_challenge")).toBe("ch");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });

  it("exchangeCode verifies id_token via JWKS and parses claims", async () => {
    jwtVerifyMock.mockResolvedValueOnce({
      payload: {
        sub: "google-12345",
        email: "u@example.com",
        email_verified: true,
        name: "User Example",
        iss: "https://accounts.google.com",
        aud: "client-id",
      },
    });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id_token: "signed.token.here" }), { status: 200 }));

    const { GoogleOauthProvider } = await import("./google-oauth.provider");
    const profile = await new GoogleOauthProvider().exchangeCode({ code: "c", codeVerifier: "v" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      "signed.token.here",
      expect.anything(),
      expect.objectContaining({
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: "client-id",
        algorithms: ["RS256"],
      }),
    );
    expect(profile).toEqual({
      provider: "google",
      providerUserId: "google-12345",
      email: "u@example.com",
      emailVerified: true,
      displayName: "User Example",
    });
  });

  it("exchangeCode rejects when JWKS verification fails", async () => {
    jwtVerifyMock.mockRejectedValueOnce(new Error("signature verification failed"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id_token: "forged.token" }), { status: 200 }),
    );
    const { GoogleOauthProvider } = await import("./google-oauth.provider");
    await expect(
      new GoogleOauthProvider().exchangeCode({ code: "c", codeVerifier: "v" }),
    ).rejects.toThrow(/signature verification failed/);
  });

  it("exchangeCode throws on non-200 from Google", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 400 }));
    const { GoogleOauthProvider } = await import("./google-oauth.provider");
    await expect(
      new GoogleOauthProvider().exchangeCode({ code: "c", codeVerifier: "v" }),
    ).rejects.toThrow(/Google token exchange failed/);
  });

  it("exchangeCode throws on missing id_token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const { GoogleOauthProvider } = await import("./google-oauth.provider");
    await expect(
      new GoogleOauthProvider().exchangeCode({ code: "c", codeVerifier: "v" }),
    ).rejects.toThrow(/missing id_token/);
  });
});
