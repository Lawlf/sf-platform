import type {
  McpAuditEntry,
  McpAuditLogRepository,
} from "@/domain/ports/repositories/mcp-audit-log.repository";

export interface ListMcpAuditDeps {
  audit: McpAuditLogRepository;
}

export interface ListMcpAuditInput {
  userId: string;
  limit?: number;
}

export async function listMcpAudit(
  deps: ListMcpAuditDeps,
  input: ListMcpAuditInput,
): Promise<McpAuditEntry[]> {
  return deps.audit.listForUser(input.userId, input.limit ?? 50);
}
