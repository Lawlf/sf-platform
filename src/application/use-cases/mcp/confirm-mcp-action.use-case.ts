import { McpConfirmationInvalid } from "@/domain/errors/mcp-errors";
import type { McpContext } from "@/domain/mcp/mcp-context";
import { findWriteAction } from "@/domain/mcp/write-actions";
import type { Clock } from "@/domain/ports/clock.port";
import type { McpAuditLogRepositoryPort } from "@/domain/ports/repositories/mcp-audit-log.repository";
import type { McpPendingActionRepositoryPort } from "@/domain/ports/repositories/mcp-pending-action.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import { err, ok, type Result } from "@/shared/errors/result";

import { executeWrite, type WriteExecutorDeps, type WriteExecutorResult } from "./write-executor";

export interface ConfirmMcpActionDeps {
  executor: WriteExecutorDeps;
  audit: McpAuditLogRepositoryPort;
  pending: McpPendingActionRepositoryPort;
  hasher: Hasher;
  clock: Clock;
  resolveProfileId: (userId: string) => Promise<string>;
}

export interface ConfirmMcpActionInput {
  ctx: McpContext;
  confirmationToken: string;
}

export interface ConfirmMcpActionOutput {
  result: WriteExecutorResult;
  auditId: string;
}

export async function confirmMcpAction(
  deps: ConfirmMcpActionDeps,
  input: ConfirmMcpActionInput,
): Promise<Result<ConfirmMcpActionOutput, McpConfirmationInvalid>> {
  const tokenHash = await deps.hasher.sha256Hex(input.confirmationToken);
  const pending = await deps.pending.findByTokenHash(tokenHash);

  if (!pending) return err(new McpConfirmationInvalid());
  if (pending.status !== "pending") return err(new McpConfirmationInvalid());
  if (pending.connectionId !== input.ctx.connectionId) return err(new McpConfirmationInvalid());

  const now = deps.clock.now();
  if (pending.expiresAt.getTime() <= now.getTime()) {
    await deps.pending.setStatus(pending.id, "expired", now);
    return err(new McpConfirmationInvalid());
  }

  const action = findWriteAction(pending.toolName);
  if (!action) return err(new McpConfirmationInvalid());

  const claimed = await deps.pending.claim(pending.id, now);
  if (!claimed) return err(new McpConfirmationInvalid());

  const profileId = await deps.resolveProfileId(pending.userId);
  const result = await executeWrite(deps.executor, {
    toolName: pending.toolName,
    userId: pending.userId,
    profileId,
    isPro: input.ctx.isPro,
    args: pending.args,
  });

  const entry = await deps.audit.record({
    connectionId: pending.connectionId,
    userId: pending.userId,
    toolName: pending.toolName,
    scope: action.scope,
    entityType: result.entityType,
    entityId: result.entityId,
    argsRedacted: pending.args,
    beforeState: result.before,
    afterState: result.after,
    reversible: result.reversible,
  });

  return ok({ result, auditId: entry.id });
}
