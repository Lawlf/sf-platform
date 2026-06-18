"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  revokeConnection,
  setConnectionScope,
} from "@/application/use-cases/mcp/manage-connection.use-case";
import { resolvePendingAction } from "@/application/use-cases/mcp/resolve-pending-action.use-case";
import { undoMcpAction } from "@/application/use-cases/mcp/undo-mcp-action.use-case";
import { isMcpScope } from "@/domain/mcp/scopes";
import { clock, repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
import { resolvePfProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const ROUTE = "/app/configuracoes/integracoes";

export const revokeConnectionAction = action({
  schema: z.object({ connection_id: z.string() }),
  handler: async (input, { userId }) => {
    await revokeConnection(
      {
        connections: repos.mcpConnections,
        tokens: repos.mcpTokens,
        clock,
      },
      { userId, connectionId: input.connection_id },
    );
    revalidatePath(ROUTE);
    redirect(ROUTE);
  },
});

export const toggleScopeAction = action({
  schema: z.object({
    connection_id: z.string(),
    scope: z.string(),
    grant: z.string().optional(),
  }),
  handler: async (input, { userId }) => {
    if (!isMcpScope(input.scope)) return;
    await setConnectionScope(
      {
        connections: repos.mcpConnections,
        tokens: repos.mcpTokens,
        clock,
      },
      {
        userId,
        connectionId: input.connection_id,
        scope: input.scope,
        grant: input.grant === "true",
      },
    );
  },
  revalidatePaths: (_data, input) => [`${ROUTE}/${input.connection_id}`],
});

const pendingSchema = z.object({ pending_id: z.string().min(1) });

function pendingExecutorDeps() {
  return {
    executor: {
      incomes: repos.incomes,
      debts: repos.debts,
      payments: repos.debtPayments,
      allocations: repos.assetDebtAllocations,
      assets: repos.assets,
      goals: repos.goals,
      transactions: repos.transactions,
      userCategories: repos.userCategories,
      clock,
    },
    audit: repos.mcpAuditLogs,
    pending: repos.mcpPendingActions,
    clock,
    resolveProfileId: resolvePfProfileId,
  };
}

export const approvePendingAction = action({
  schema: pendingSchema,
  handler: async (input, { userId }) => {
    const user = await requireUser();
    await resolvePendingAction(pendingExecutorDeps(), {
      userId,
      isPro: user.isPro,
      pendingId: input.pending_id,
      decision: "approve",
    });
  },
  revalidatePaths: () => [`${ROUTE}/pendentes`, ROUTE],
});

export const rejectPendingAction = action({
  schema: pendingSchema,
  handler: async (input, { userId }) => {
    const user = await requireUser();
    await resolvePendingAction(pendingExecutorDeps(), {
      userId,
      isPro: user.isPro,
      pendingId: input.pending_id,
      decision: "reject",
    });
  },
  revalidatePaths: () => [`${ROUTE}/pendentes`, ROUTE],
});

export const undoAuditAction = action({
  schema: z.object({ audit_id: z.string().min(1) }),
  handler: async (input, { userId }) => {
    await undoMcpAction(
      {
        audit: repos.mcpAuditLogs,
        incomes: repos.incomes,
        debts: repos.debts,
        assets: repos.assets,
        goals: repos.goals,
        clock,
      },
      { userId, auditId: input.audit_id },
    );
  },
  revalidatePaths: () => [`${ROUTE}/atividade`],
});

export async function revokeConnectionFormAction(formData: FormData): Promise<void> {
  await revokeConnectionAction(formData);
}

export async function toggleScopeFormAction(formData: FormData): Promise<void> {
  await toggleScopeAction(formData);
}

export async function approvePendingFormAction(formData: FormData): Promise<void> {
  await approvePendingAction(formData);
}

export async function rejectPendingFormAction(formData: FormData): Promise<void> {
  await rejectPendingAction(formData);
}

export async function undoAuditFormAction(formData: FormData): Promise<void> {
  await undoAuditAction(formData);
}
