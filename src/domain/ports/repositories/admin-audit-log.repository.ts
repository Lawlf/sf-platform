export interface AdminAuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface RecordAuditInput {
  /** Admin user id who performed the action. */
  actorId: string;
  /** Stable action key, e.g. "pro.grant" / "pro.revoke". */
  action: string;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AdminAuditLogRepositoryPort {
  record(input: RecordAuditInput): Promise<void>;
  list(limit: number, offset?: number): Promise<AdminAuditLogEntry[]>;
}
