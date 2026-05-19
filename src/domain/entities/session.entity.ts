export interface SessionEntity {
  idHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ip: string | null;
  userAgent: string | null;
}
