"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  revokeConnection,
  setConnectionScope,
} from "@/application/use-cases/mcp/manage-connection.use-case";
import { resolvePendingAction } from "@/application/use-cases/mcp/resolve-pending-action.use-case";
import { undoMcpAction } from "@/application/use-cases/mcp/undo-mcp-action.use-case";
import { isMcpScope } from "@/domain/mcp/scopes";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleMcpAuditLogRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-audit-log.repository";
import { DrizzleMcpConnectionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-connection.repository";
import { DrizzleMcpPendingActionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-pending-action.repository";
import { DrizzleMcpTokenRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-token.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const ROUTE = "/app/configuracoes/integracoes";

export async function revokeConnectionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const connectionId = String(formData.get("connection_id") ?? "");
  await revokeConnection(
    {
      connections: new DrizzleMcpConnectionRepository(),
      tokens: new DrizzleMcpTokenRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, connectionId },
  );
  revalidatePath(ROUTE);
  redirect(ROUTE);
}

export async function toggleScopeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const connectionId = String(formData.get("connection_id") ?? "");
  const scope = String(formData.get("scope") ?? "");
  const grant = String(formData.get("grant") ?? "") === "true";
  if (!isMcpScope(scope)) return;
  await setConnectionScope(
    {
      connections: new DrizzleMcpConnectionRepository(),
      tokens: new DrizzleMcpTokenRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, connectionId, scope, grant },
  );
  revalidatePath(`${ROUTE}/${connectionId}`);
}

export async function approvePendingAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const pendingId = String(formData.get("pending_id") ?? "");
  if (!pendingId) return;
  await resolvePendingAction(
    {
      executor: {
        incomes: new DrizzleIncomeRepository(),
        debts: new DrizzleDebtRepository(),
        payments: new DrizzleDebtPaymentRepository(),
        allocations: new DrizzleAssetDebtAllocationRepository(),
        assets: new DrizzleAssetRepository(),
        goals: new DrizzleGoalRepository(),
        clock: new SystemClock(),
      },
      audit: new DrizzleMcpAuditLogRepository(),
      pending: new DrizzleMcpPendingActionRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, isPro: user.isPro, pendingId, decision: "approve" },
  );
  revalidatePath(`${ROUTE}/pendentes`);
  revalidatePath(ROUTE);
}

export async function rejectPendingAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const pendingId = String(formData.get("pending_id") ?? "");
  if (!pendingId) return;
  await resolvePendingAction(
    {
      executor: {
        incomes: new DrizzleIncomeRepository(),
        debts: new DrizzleDebtRepository(),
        payments: new DrizzleDebtPaymentRepository(),
        allocations: new DrizzleAssetDebtAllocationRepository(),
        assets: new DrizzleAssetRepository(),
        goals: new DrizzleGoalRepository(),
        clock: new SystemClock(),
      },
      audit: new DrizzleMcpAuditLogRepository(),
      pending: new DrizzleMcpPendingActionRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, isPro: user.isPro, pendingId, decision: "reject" },
  );
  revalidatePath(`${ROUTE}/pendentes`);
  revalidatePath(ROUTE);
}

export async function undoAuditAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const auditId = String(formData.get("audit_id") ?? "");
  if (!auditId) return;
  await undoMcpAction(
    {
      audit: new DrizzleMcpAuditLogRepository(),
      incomes: new DrizzleIncomeRepository(),
      debts: new DrizzleDebtRepository(),
      assets: new DrizzleAssetRepository(),
      goals: new DrizzleGoalRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, auditId },
  );
  revalidatePath(`${ROUTE}/atividade`);
}
