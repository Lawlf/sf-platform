import type { McpScope } from "@/domain/mcp/scopes";

export interface McpAuditEntry {
  id: string;
  connectionId: string;
  userId: string;
  toolName: string;
  scope: string;
  entityType: string;
  entityId: string | null;
  argsRedacted: Record<string, unknown>;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  reversible: boolean;
  undoneAt: Date | null;
  createdAt: Date;
}

export interface McpAuditLogRepository {
  record(input: {
    connectionId: string;
    userId: string;
    toolName: string;
    scope: McpScope;
    entityType: string;
    entityId: string | null;
    argsRedacted: Record<string, unknown>;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
    reversible: boolean;
  }): Promise<McpAuditEntry>;
  listForUser(userId: string, limit: number): Promise<McpAuditEntry[]>;
  findById(id: string): Promise<McpAuditEntry | null>;
  markUndone(id: string, now: Date): Promise<void>;
}
