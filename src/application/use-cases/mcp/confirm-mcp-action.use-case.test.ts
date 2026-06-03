import { beforeEach, describe, expect, it, vi } from "vitest";

import type { McpContext } from "@/domain/mcp/mcp-context";
import type { McpPendingAction } from "@/domain/ports/repositories/mcp-pending-action.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { confirmMcpAction, type ConfirmMcpActionDeps } from "./confirm-mcp-action.use-case";
import { executeWrite, type WriteExecutorResult } from "./write-executor";

vi.mock("./write-executor", () => ({ executeWrite: vi.fn() }));

const ctx: McpContext = {
  connectionId: "conn-1",
  userId: "u1",
  isPro: true,
  scopes: ["goals:delete"],
};

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
    executor: {} as ConfirmMcpActionDeps["executor"],
    audit: { record: auditRecord } as unknown as ConfirmMcpActionDeps["audit"],
    pending: {
      findByTokenHash: vi.fn(async () => p),
      setStatus,
      claim,
    } as unknown as ConfirmMcpActionDeps["pending"],
    hasher: { sha256Hex: vi.fn(async () => "hash-token") },
    clock: { now: () => new Date("2026-06-03T12:00:00Z") },
  } as unknown as ConfirmMcpActionDeps;
  return { deps, setStatus, claim, auditRecord };
}

const execResult: WriteExecutorResult = {
  entityType: "goal",
  entityId: "g1",
  before: { id: "g1" },
  after: null,
  reversible: true,
};

describe("confirmMcpAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("token válido reivindica, executa e audita", async () => {
    (executeWrite as ReturnType<typeof vi.fn>).mockResolvedValue(execResult);
    const { deps, claim, auditRecord } = makeDeps(pending());

    const r = await confirmMcpAction(deps, { ctx, confirmationToken: "raw-token" });

    expect(isOk(r)).toBe(true);
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.auditId).toBe("audit-1");
    expect(claim).toHaveBeenCalledWith("pending-1", expect.any(Date));
    expect(auditRecord).toHaveBeenCalledOnce();
  });

  it("claim perdido (concorrência/retry) retorna inválido e não executa", async () => {
    (executeWrite as ReturnType<typeof vi.fn>).mockResolvedValue(execResult);
    const { deps, auditRecord } = makeDeps(pending(), false);

    const r = await confirmMcpAction(deps, { ctx, confirmationToken: "raw-token" });

    expect(isErr(r)).toBe(true);
    expect(executeWrite).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it("pending inexistente retorna McpConfirmationInvalid", async () => {
    const { deps } = makeDeps(null);
    const r = await confirmMcpAction(deps, { ctx, confirmationToken: "x" });
    expect(isErr(r)).toBe(true);
  });

  it("status já executed retorna inválido e não executa", async () => {
    const { deps } = makeDeps(pending({ status: "executed" }));
    const r = await confirmMcpAction(deps, { ctx, confirmationToken: "raw-token" });
    expect(isErr(r)).toBe(true);
    expect(executeWrite).not.toHaveBeenCalled();
  });

  it("connection diferente retorna inválido", async () => {
    const { deps } = makeDeps(pending({ connectionId: "outra" }));
    const r = await confirmMcpAction(deps, { ctx, confirmationToken: "raw-token" });
    expect(isErr(r)).toBe(true);
  });

  it("token expirado marca expired e retorna inválido", async () => {
    const { deps, setStatus } = makeDeps(pending({ expiresAt: past }));
    const r = await confirmMcpAction(deps, { ctx, confirmationToken: "raw-token" });
    expect(isErr(r)).toBe(true);
    expect(setStatus).toHaveBeenCalledWith("pending-1", "expired", expect.any(Date));
  });
});
