import { McpConfirmationInvalid, McpPendingNotFound } from "@/domain/errors/mcp-errors";
import { findWriteAction } from "@/domain/mcp/write-actions";
import type { Clock } from "@/domain/ports/clock.port";
import type { McpAuditLogRepository } from "@/domain/ports/repositories/mcp-audit-log.repository";
import type { McpPendingActionRepository } from "@/domain/ports/repositories/mcp-pending-action.repository";
import { err, ok, type Result } from "@/shared/errors/result";

import { executeWrite, type WriteExecutorDeps, type WriteExecutorResult } from "./write-executor";

export interface ResolvePendingActionDeps {
  executor: WriteExecutorDeps;
  audit: McpAuditLogRepository;
  pending: McpPendingActionRepository;
  clock: Clock;
}

export interface ResolvePendingActionInput {
  userId: string;
  isPro: boolean;
  pendingId: string;
  decision: "approve" | "reject";
}

export type ResolvePendingActionOutput =
  | { decision: "approve"; result: WriteExecutorResult; auditId: string }
  | { decision: "reject" };

export async function resolvePendingAction(
  deps: ResolvePendingActionDeps,
  input: ResolvePendingActionInput,
): Promise<Result<ResolvePendingActionOutput, McpPendingNotFound | McpConfirmationInvalid>> {
  const pending = await deps.pending.findById(input.pendingId);
  if (!pending || pending.userId !== input.userId) {
    return err(new McpPendingNotFound());
  }
  if (pending.status !== "pending") {
    return err(new McpConfirmationInvalid());
  }

  const now = deps.clock.now();
  if (pending.expiresAt.getTime() <= now.getTime()) {
    await deps.pending.setStatus(pending.id, "expired", now);
    return err(new McpConfirmationInvalid());
  }

  if (input.decision === "reject") {
    await deps.pending.setStatus(pending.id, "rejected", deps.clock.now());
    return ok({ decision: "reject" });
  }

  const action = findWriteAction(pending.toolName);
  if (!action) return err(new McpConfirmationInvalid());

  const claimed = await deps.pending.claim(pending.id, now);
  if (!claimed) return err(new McpConfirmationInvalid());

  const result = await executeWrite(deps.executor, {
    toolName: pending.toolName,
    userId: pending.userId,
    isPro: input.isPro,
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

  return ok({ decision: "approve", result, auditId: entry.id });
}
