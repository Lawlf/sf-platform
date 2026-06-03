import type { McpScope } from "@/domain/mcp/scopes";

export interface McpConnection {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  status: "active" | "revoked";
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
}

export interface McpConnectionRepository {
  create(input: {
    userId: string;
    clientId: string;
    clientName: string;
    scopes: McpScope[];
  }): Promise<McpConnection>;
  findById(id: string): Promise<McpConnection | null>;
  listForUser(userId: string): Promise<McpConnection[]>;
  listScopes(connectionId: string): Promise<McpScope[]>;
  revoke(id: string, now: Date): Promise<void>;
  addScope(connectionId: string, scope: McpScope): Promise<void>;
  removeScope(connectionId: string, scope: McpScope): Promise<void>;
  touch(id: string, now: Date): Promise<void>;
}
