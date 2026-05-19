export type OauthProviderId = "google" | "apple";

export interface OauthAccountEntity {
  id: string;
  userId: string;
  provider: OauthProviderId;
  providerUserId: string;
  createdAt: Date;
}
