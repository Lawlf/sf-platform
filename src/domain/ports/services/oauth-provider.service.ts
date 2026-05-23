import type { OauthProviderId } from "@/domain/entities/oauth-account.entity";

export interface OauthProfile {
  provider: OauthProviderId;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
}

export interface OauthProvider {
  readonly id: OauthProviderId;
  buildAuthUrl(input: { state: string; codeChallenge: string }): Promise<string>;
  exchangeCode(input: { code: string; codeVerifier: string }): Promise<OauthProfile>;
}
