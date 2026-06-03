export interface McpPendingAction {
  id: string;
  connectionId: string;
  userId: string;
  toolName: string;
  args: Record<string, unknown>;
  preview: Record<string, unknown>;
  confirmationTokenHash: string;
  status: "pending" | "approved" | "rejected" | "executed" | "expired";
  expiresAt: Date;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface McpPendingActionRepository {
  create(input: {
    connectionId: string;
    userId: string;
    toolName: string;
    args: Record<string, unknown>;
    preview: Record<string, unknown>;
    confirmationTokenHash: string;
    expiresAt: Date;
  }): Promise<McpPendingAction>;
  findById(id: string): Promise<McpPendingAction | null>;
  findByTokenHash(tokenHash: string): Promise<McpPendingAction | null>;
  listPendingForUser(userId: string): Promise<McpPendingAction[]>;
  setStatus(id: string, status: McpPendingAction["status"], now: Date): Promise<void>;
  claim(id: string, now: Date): Promise<boolean>;
}
