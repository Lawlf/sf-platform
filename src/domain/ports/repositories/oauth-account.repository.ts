import type { OauthAccountEntity, OauthProviderId } from "@/domain/entities/oauth-account.entity";

export interface OauthAccountRepositoryPort {
  findByProviderAndId(
    provider: OauthProviderId,
    providerUserId: string,
  ): Promise<OauthAccountEntity | null>;
  listForUser(userId: string): Promise<OauthAccountEntity[]>;
  create(input: {
    userId: string;
    provider: OauthProviderId;
    providerUserId: string;
  }): Promise<OauthAccountEntity>;
}
