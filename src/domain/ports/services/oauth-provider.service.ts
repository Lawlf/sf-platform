export interface OauthProfile {
  provider: "google" | "apple";
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
}

export interface OauthProvider {
  readonly id: "google" | "apple";
  buildAuthUrl(input: { state: string; codeChallenge: string }): Promise<string>;
  exchangeCode(input: { code: string; codeVerifier: string }): Promise<OauthProfile>;
}
