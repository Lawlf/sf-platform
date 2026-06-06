import { describe, expect, it, vi } from "vitest";

import type { McpAuditEntry } from "@/domain/ports/repositories/mcp-audit-log.repository";
import { isErr, isOk } from "@/shared/errors/result";

import { undoMcpAction, type UndoMcpActionDeps } from "./undo-mcp-action.use-case";

function auditEntry(overrides: Partial<McpAuditEntry> = {}): McpAuditEntry {
  return {
    id: "audit-1",
    connectionId: "conn-1",
    userId: "u1",
    toolName: "income_create",
    scope: "incomes:write",
    entityType: "income",
    entityId: "i1",
    argsRedacted: {},
    beforeState: null,
    afterState: { id: "i1" },
    reversible: true,
    undoneAt: null,
    createdAt: new Date("2026-06-03T11:00:00Z"),
    ...overrides,
  };
}

function makeDeps(entry: McpAuditEntry | null) {
  const markUndone = vi.fn(async () => undefined);
  const incomes = {
    softDelete: vi.fn(async () => undefined),
    restore: vi.fn(async () => undefined),
    update: vi.fn(async (e: unknown) => e),
  };
  const goals = {
    softDelete: vi.fn(async () => undefined),
    restore: vi.fn(async () => undefined),
    update: vi.fn(async () => null),
  };
  const debts = { softDelete: vi.fn(async () => undefined), update: vi.fn(async (e: unknown) => e) };
  const assets = { softDelete: vi.fn(async () => undefined), update: vi.fn(async () => undefined) };
  const deps = {
    audit: { findById: vi.fn(async () => entry), markUndone },
    incomes,
    debts,
    assets,
    goals,
    clock: { now: () => new Date("2026-06-03T12:00:00Z") },
  } as unknown as UndoMcpActionDeps;
  return { deps, markUndone, incomes, goals, debts, assets };
}

describe("undoMcpAction", () => {
  it("undo de create soft-deleta a entidade e marca undone", async () => {
    const { deps, markUndone, incomes } = makeDeps(auditEntry());
    const r = await undoMcpAction(deps, { userId: "u1", auditId: "audit-1" });
    expect(isOk(r)).toBe(true);
    expect(incomes.softDelete).toHaveBeenCalledWith("i1", expect.any(Date));
    expect(markUndone).toHaveBeenCalledWith("audit-1", expect.any(Date));
  });

  it("undo de delete de income restaura", async () => {
    const { deps, incomes } = makeDeps(
      auditEntry({
        toolName: "income_delete",
        entityType: "income",
        beforeState: { id: "i1" },
        afterState: null,
      }),
    );
    const r = await undoMcpAction(deps, { userId: "u1", auditId: "audit-1" });
    expect(isOk(r)).toBe(true);
    expect(incomes.restore).toHaveBeenCalledWith("i1");
  });

  it("undo de update de income restaura o beforeState", async () => {
    const before = {
      id: "i1",
      userId: "u1",
      label: "Salário",
      amount: { cents: "500000", currency: "BRL" },
      frequency: "monthly",
      startDate: "2026-06-01T00:00:00.000Z",
      endDate: null,
      isActive: true,
      createdAt: "2026-06-01T00:00:00.000Z",
      deletedAt: null,
    };
    const { deps, incomes } = makeDeps(
      auditEntry({ toolName: "income_update", entityType: "income", beforeState: before }),
    );
    const r = await undoMcpAction(deps, { userId: "u1", auditId: "audit-1" });
    expect(isOk(r)).toBe(true);
    expect(incomes.update).toHaveBeenCalledOnce();
    const arg = incomes.update.mock.calls[0]![0] as { id: string; amount: { toCents(): bigint } };
    expect(arg.id).toBe("i1");
    expect(arg.amount.toCents()).toBe(500000n);
  });

  it("undo de update de income preserva a moeda do snapshot", async () => {
    const before = {
      id: "i1",
      userId: "u1",
      label: "Salário",
      amount: { cents: "500000", currency: "USD" },
      frequency: "monthly",
      startDate: "2026-06-01T00:00:00.000Z",
      endDate: null,
      isActive: true,
      createdAt: "2026-06-01T00:00:00.000Z",
      deletedAt: null,
    };
    const { deps, incomes } = makeDeps(
      auditEntry({ toolName: "income_update", entityType: "income", beforeState: before }),
    );
    const r = await undoMcpAction(deps, { userId: "u1", auditId: "audit-1" });
    expect(isOk(r)).toBe(true);
    expect(incomes.update).toHaveBeenCalledOnce();
    const arg = incomes.update.mock.calls[0]![0] as {
      amount: { toCents(): bigint; currency: string };
    };
    expect(arg.amount.toCents()).toBe(500000n);
    expect(arg.amount.currency).toBe("USD");
  });

  it("undo de ação irreversível retorna erro", async () => {
    const { deps } = makeDeps(auditEntry({ reversible: false }));
    const r = await undoMcpAction(deps, { userId: "u1", auditId: "audit-1" });
    expect(isErr(r)).toBe(true);
  });

  it("undo já feito retorna erro", async () => {
    const { deps } = makeDeps(auditEntry({ undoneAt: new Date("2026-06-03T11:30:00Z") }));
    const r = await undoMcpAction(deps, { userId: "u1", auditId: "audit-1" });
    expect(isErr(r)).toBe(true);
  });

  it("undo de outro usuário é negado", async () => {
    const { deps } = makeDeps(auditEntry({ userId: "outro" }));
    const r = await undoMcpAction(deps, { userId: "u1", auditId: "audit-1" });
    expect(isErr(r)).toBe(true);
  });
});
