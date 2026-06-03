import { beforeEach, describe, expect, it, vi } from "vitest";

import type { McpPendingAction } from "@/domain/ports/repositories/mcp-pending-action.repository";
import { isErr, isOk } from "@/shared/errors/result";

import {
  resolvePendingAction,
  type ResolvePendingActionDeps,
} from "./resolve-pending-action.use-case";
import { executeWrite, type WriteExecutorResult } from "./write-executor";

vi.mock("./write-executor", () => ({ executeWrite: vi.fn() }));

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

function makeDeps(p: McpPendingAction | null, claimResult = true) {
  const setStatus = vi.fn(async () => undefined);
  const claim = vi.fn(async () => claimResult);
  const auditRecord = vi.fn(async () => ({ id: "audit-1" }));
  const deps = {
    executor: {} as ResolvePendingActionDeps["executor"],
    audit: { record: auditRecord } as unknown as ResolvePendingActionDeps["audit"],
    pending: {
      findById: vi.fn(async () => p),
      setStatus,
      claim,
    } as unknown as ResolvePendingActionDeps["pending"],
    clock: { now: () => new Date("2026-06-03T12:00:00Z") },
  } as unknown as ResolvePendingActionDeps;
  return { deps, setStatus, claim, auditRecord };
}

const execResult: WriteExecutorResult = {
  entityType: "goal",
  entityId: "g1",
  before: { id: "g1" },
  after: null,
  reversible: true,
};

describe("resolvePendingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approve reivindica, executa e audita", async () => {
    (executeWrite as ReturnType<typeof vi.fn>).mockResolvedValue(execResult);
    const { deps, claim, auditRecord } = makeDeps(pending());

    const r = await resolvePendingAction(deps, {
      userId: "u1",
      isPro: true,
      pendingId: "pending-1",
      decision: "approve",
    });

    expect(isOk(r)).toBe(true);
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.decision).toBe("approve");
    expect(claim).toHaveBeenCalledWith("pending-1", expect.any(Date));
    expect(auditRecord).toHaveBeenCalledOnce();
  });

  it("approve com claim perdido retorna inválido e não executa", async () => {
    (executeWrite as ReturnType<typeof vi.fn>).mockResolvedValue(execResult);
    const { deps, auditRecord } = makeDeps(pending(), false);

    const r = await resolvePendingAction(deps, {
      userId: "u1",
      isPro: true,
      pendingId: "pending-1",
      decision: "approve",
    });

    expect(isErr(r)).toBe(true);
    expect(executeWrite).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it("reject não executa, marca rejected", async () => {
    const { deps, setStatus, auditRecord } = makeDeps(pending());

    const r = await resolvePendingAction(deps, {
      userId: "u1",
      isPro: true,
      pendingId: "pending-1",
      decision: "reject",
    });

    expect(isOk(r)).toBe(true);
    expect(executeWrite).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith("pending-1", "rejected", expect.any(Date));
  });

  it("outro usuário é negado (McpPendingNotFound)", async () => {
    const { deps } = makeDeps(pending({ userId: "outro" }));
    const r = await resolvePendingAction(deps, {
      userId: "u1",
      isPro: true,
      pendingId: "pending-1",
      decision: "approve",
    });
    expect(isErr(r)).toBe(true);
  });

  it("expirado é negado e marca expired", async () => {
    const { deps, setStatus } = makeDeps(pending({ expiresAt: past }));
    const r = await resolvePendingAction(deps, {
      userId: "u1",
      isPro: true,
      pendingId: "pending-1",
      decision: "approve",
    });
    expect(isErr(r)).toBe(true);
    expect(setStatus).toHaveBeenCalledWith("pending-1", "expired", expect.any(Date));
  });
});
