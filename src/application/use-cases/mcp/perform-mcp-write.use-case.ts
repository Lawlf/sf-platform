import { MCP_CONFIRMATION_TOKEN_TTL_MS } from "@/domain/mcp/constants";
import type { McpContext } from "@/domain/mcp/mcp-context";
import { findWriteAction, requiresConfirmation } from "@/domain/mcp/write-actions";
import type { Clock } from "@/domain/ports/clock.port";
import type { McpAuditLogRepositoryPort } from "@/domain/ports/repositories/mcp-audit-log.repository";
import type { McpPendingActionRepositoryPort } from "@/domain/ports/repositories/mcp-pending-action.repository";
import type { McpWriteIdempotencyRepositoryPort } from "@/domain/ports/repositories/mcp-write-idempotency.repository";
import { issueOpaqueToken } from "@/infrastructure/mcp/mcp-token-factory";

import { executeWrite, type WriteExecutorDeps, type WriteExecutorResult } from "./write-executor";

export interface PerformMcpWriteDeps {
  executor: WriteExecutorDeps;
  audit: McpAuditLogRepositoryPort;
  pending: McpPendingActionRepositoryPort;
  idempotency: McpWriteIdempotencyRepositoryPort;
  clock: Clock;
}

export interface PerformMcpWriteInput {
  ctx: McpContext;
  toolName: string;
  args: Record<string, unknown>;
  maxAmountCents: number;
  idempotencyKey?: string;
}

export type PerformMcpWriteOutput =
  | { kind: "executed"; result: WriteExecutorResult; auditId: string }
  | {
      kind: "needs_confirmation";
      pendingId: string;
      confirmationToken: string;
      preview: Record<string, unknown>;
      expiresInSec: number;
    };

export function buildPreview(
  entityType: string,
  verb: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  return { entityType, verb, args };
}

export async function performMcpWrite(
  deps: PerformMcpWriteDeps,
  input: PerformMcpWriteInput,
): Promise<PerformMcpWriteOutput> {
  const action = findWriteAction(input.toolName);
  if (!action) {
    throw new Error(`Ferramenta de escrita desconhecida: ${input.toolName}`);
  }

  if (input.idempotencyKey) {
    const cached = await deps.idempotency.find(input.ctx.connectionId, input.idempotencyKey);
    if (cached) {
      return {
        kind: "executed",
        result: cached.result as WriteExecutorResult,
        auditId: String(cached.auditId ?? ""),
      };
    }
  }

  if (requiresConfirmation(action.verb, input.maxAmountCents)) {
    const token = await issueOpaqueToken();
    const expiresAt = new Date(deps.clock.now().getTime() + MCP_CONFIRMATION_TOKEN_TTL_MS);
    const preview = buildPreview(action.entityType, action.verb, input.args);
    const created = await deps.pending.create({
      connectionId: input.ctx.connectionId,
      userId: input.ctx.userId,
      toolName: input.toolName,
      args: input.args,
      preview,
      confirmationTokenHash: token.hash,
      expiresAt,
    });
    return {
      kind: "needs_confirmation",
      pendingId: created.id,
      confirmationToken: token.raw,
      preview,
      expiresInSec: Math.floor(MCP_CONFIRMATION_TOKEN_TTL_MS / 1000),
    };
  }

  const result = await executeWrite(deps.executor, {
    toolName: input.toolName,
    userId: input.ctx.userId,
    isPro: input.ctx.isPro,
    args: input.args,
  });

  const entry = await deps.audit.record({
    connectionId: input.ctx.connectionId,
    userId: input.ctx.userId,
    toolName: input.toolName,
    scope: action.scope,
    entityType: result.entityType,
    entityId: result.entityId,
    argsRedacted: input.args,
    beforeState: result.before,
    afterState: result.after,
    reversible: result.reversible,
  });

  if (input.idempotencyKey) {
    await deps.idempotency.save(input.ctx.connectionId, input.idempotencyKey, {
      result: result as unknown as Record<string, unknown>,
      auditId: entry.id,
    });
  }

  return { kind: "executed", result, auditId: entry.id };
}
