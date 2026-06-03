import { beforeEach, describe, expect, it, vi } from "vitest";

import type { McpContext } from "@/domain/mcp/mcp-context";

import { performMcpWrite, type PerformMcpWriteDeps } from "./perform-mcp-write.use-case";
import { executeWrite, type WriteExecutorResult } from "./write-executor";

vi.mock("./write-executor", () => ({ executeWrite: vi.fn() }));

vi.mock("@/infrastructure/mcp/mcp-token-factory", () => ({
  issueOpaqueToken: vi.fn(async () => ({ raw: "raw-token", hash: "hash-token" })),
}));

const ctx: McpContext = {
  connectionId: "conn-1",
  userId: "u1",
  isPro: true,
  scopes: ["incomes:write", "goals:delete"],
};

function makeDeps(): PerformMcpWriteDeps & {
  auditRecord: ReturnType<typeof vi.fn>;
  pendingCreate: ReturnType<typeof vi.fn>;
  idemFind: ReturnType<typeof vi.fn>;
  idemSave: ReturnType<typeof vi.fn>;
} {
  const auditRecord = vi.fn(async () => ({ id: "audit-1" }));
  const pendingCreate = vi.fn(async () => ({ id: "pending-1" }));
  const idemFind = vi.fn(async () => null);
  const idemSave = vi.fn(async () => undefined);

  const deps = {
    executor: {} as PerformMcpWriteDeps["executor"],
    audit: { record: auditRecord } as unknown as PerformMcpWriteDeps["audit"],
    pending: { create: pendingCreate } as unknown as PerformMcpWriteDeps["pending"],
    idempotency: {
      find: idemFind,
      save: idemSave,
    } as unknown as PerformMcpWriteDeps["idempotency"],
    clock: { now: () => new Date("2026-06-03T12:00:00Z") },
  };

  return { ...deps, auditRecord, pendingCreate, idemFind, idemSave };
}

describe("performMcpWrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create de baixo valor executa direto, audita e retorna executed", async () => {
    const result: WriteExecutorResult = {
      entityType: "income",
      entityId: "i1",
      before: null,
      after: { id: "i1", label: "Salário" },
      reversible: true,
    };
    (executeWrite as ReturnType<typeof vi.fn>).mockResolvedValue(result);
    const deps = makeDeps();

    const out = await performMcpWrite(deps, {
      ctx,
      toolName: "income_create",
      args: { label: "Salário", amountCents: 100000 },
      maxAmountCents: 100000,
    });

    expect(out.kind).toBe("executed");
    if (out.kind !== "executed") throw new Error("expected executed");
    expect(out.result).toEqual(result);
    expect(out.auditId).toBe("audit-1");
    expect(deps.auditRecord).toHaveBeenCalledOnce();
    expect(deps.pendingCreate).not.toHaveBeenCalled();
  });

  it("delete não executa, cria pending e retorna needs_confirmation com token + preview", async () => {
    const deps = makeDeps();

    const out = await performMcpWrite(deps, {
      ctx,
      toolName: "goal_delete",
      args: { goalId: "g1" },
      maxAmountCents: 0,
    });

    expect(out.kind).toBe("needs_confirmation");
    if (out.kind !== "needs_confirmation") throw new Error("expected needs_confirmation");
    expect(out.pendingId).toBe("pending-1");
    expect(out.confirmationToken).toBe("raw-token");
    expect(out.preview).toEqual({ entityType: "goal", verb: "delete", args: { goalId: "g1" } });
    expect(out.expiresInSec).toBe(300);
    expect(executeWrite).not.toHaveBeenCalled();
    expect(deps.pendingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ confirmationTokenHash: "hash-token", connectionId: "conn-1" }),
    );
  });

  it("create acima do limite exige confirmação", async () => {
    const deps = makeDeps();

    const out = await performMcpWrite(deps, {
      ctx,
      toolName: "income_create",
      args: { label: "Bônus", amountCents: 600000 },
      maxAmountCents: 600000,
    });

    expect(out.kind).toBe("needs_confirmation");
  });

  it("idempotency hit retorna resultado cacheado sem executar", async () => {
    const cachedResult: WriteExecutorResult = {
      entityType: "income",
      entityId: "i1",
      before: null,
      after: { id: "i1" },
      reversible: true,
    };
    const deps = makeDeps();
    deps.idemFind.mockResolvedValue({ result: cachedResult, auditId: "audit-prev" });

    const out = await performMcpWrite(deps, {
      ctx,
      toolName: "income_create",
      args: { label: "Salário", amountCents: 100000 },
      maxAmountCents: 100000,
      idempotencyKey: "key-1",
    });

    expect(out.kind).toBe("executed");
    if (out.kind !== "executed") throw new Error("expected executed");
    expect(out.result).toEqual(cachedResult);
    expect(out.auditId).toBe("audit-prev");
    expect(executeWrite).not.toHaveBeenCalled();
    expect(deps.auditRecord).not.toHaveBeenCalled();
  });

  it("salva idempotência após execução direta quando há chave", async () => {
    const result: WriteExecutorResult = {
      entityType: "income",
      entityId: "i1",
      before: null,
      after: { id: "i1" },
      reversible: true,
    };
    (executeWrite as ReturnType<typeof vi.fn>).mockResolvedValue(result);
    const deps = makeDeps();

    await performMcpWrite(deps, {
      ctx,
      toolName: "income_create",
      args: { label: "Salário", amountCents: 100000 },
      maxAmountCents: 100000,
      idempotencyKey: "key-1",
    });

    expect(deps.idemSave).toHaveBeenCalledWith("conn-1", "key-1", {
      result,
      auditId: "audit-1",
    });
  });
});
