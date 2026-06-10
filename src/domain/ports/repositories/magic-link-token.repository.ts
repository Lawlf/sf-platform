import type { MagicLinkTokenEntity } from "@/domain/entities/magic-link-token.entity";

export interface MagicLinkTokenRepositoryPort {
  findByTokenHash(tokenHash: string): Promise<MagicLinkTokenEntity | null>;
  findActiveByEmail(email: string): Promise<MagicLinkTokenEntity | null>;
  create(input: {
    tokenHash: string;
    code: string;
    email: string;
    userId: string | null;
    expiresAt: Date;
  }): Promise<MagicLinkTokenEntity>;
  markUsed(tokenHash: string): Promise<void>;
  incrementAttempts(tokenHash: string): Promise<number>;
  deleteExpired(now: Date): Promise<number>;
}
