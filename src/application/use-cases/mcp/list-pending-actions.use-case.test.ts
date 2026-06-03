import { beforeEach, describe, expect, it, vi } from "vitest";

import type { McpPendingAction } from "@/domain/ports/repositories/mcp-pending-action.repository";

import { listPendingActions, type ListPendingActionsDeps } from "./list-pending-actions.use-case";

const future = new Date("2026-06-03T12:30:00Z");
const past = new Date("2026-06-03T11:00:00Z");

function pending(overrides: Partial<McpPendingAction> = {}): McpPendingAction {
  return {
    id: "pending-1",
    connectionId: "conn-1",
    userId: "u1",
    toolName: "goal_delete",
    args: { goalId: "g1" },
    preview: {},
    confirmationTokenHash: "hash-token",
    status: "pending",
    expiresAt: future,
    createdAt: past,
    resolvedAt: null,
    ...overrides,
  };
}

function makeDeps(list: McpPendingAction[]) {
  const listPendingForUser = vi.fn(async () => list);
  const deps = {
    pending: { listPendingForUser } as unknown as ListPendingActionsDeps["pending"],
    clock: { now: () => new Date("2026-06-03T12:00:00Z") },
  } as unknown as ListPendingActionsDeps;
  return { deps, listPendingForUser };
}

describe("listPendingActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filtra expiradas e retorna apenas as ativas", async () => {
    const expired = pending({ id: "expirada", expiresAt: past });
    const active = pending({ id: "ativa", expiresAt: future });
    const { deps } = makeDeps([expired, active]);

    const r = await listPendingActions(deps, { userId: "u1" });

    expect(r).toHaveLength(1);
    expect(r[0]?.id).toBe("ativa");
  });
});
