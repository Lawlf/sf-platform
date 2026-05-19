export interface MagicLinkTokenEntity {
  tokenHash: string;
  code: string;
  email: string;
  userId: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  attemptCount: number;
  createdAt: Date;
}
