import { and, eq } from "drizzle-orm";

import type { OauthAccountEntity, OauthProviderId } from "@/domain/entities/oauth-account.entity";
import type { OauthAccountRepository } from "@/domain/ports/repositories/oauth-account.repository";

import { getDb } from "../client";
import { oauthAccounts } from "../schema/oauth-accounts.schema";

function toEntity(row: typeof oauthAccounts.$inferSelect): OauthAccountEntity {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider as OauthProviderId,
    providerUserId: row.providerUserId,
    createdAt: row.createdAt,
  };
}

export class DrizzleOauthAccountRepository implements OauthAccountRepository {
  async findByProviderAndId(
    provider: OauthProviderId,
    providerUserId: string,
  ): Promise<OauthAccountEntity | null> {
    const rows = await getDb()
      .select()
      .from(oauthAccounts)
      .where(
        and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, providerUserId)),
      )
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async listForUser(userId: string): Promise<OauthAccountEntity[]> {
    const rows = await getDb().select().from(oauthAccounts).where(eq(oauthAccounts.userId, userId));
    return rows.map(toEntity);
  }

  async create(input: {
    userId: string;
    provider: OauthProviderId;
    providerUserId: string;
  }): Promise<OauthAccountEntity> {
    const rows = await getDb()
      .insert(oauthAccounts)
      .values({
        userId: input.userId,
        provider: input.provider,
        providerUserId: input.providerUserId,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert oauth_account: no row returned");
    return toEntity(row);
  }
}
