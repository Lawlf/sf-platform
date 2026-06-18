import { describe, expect, it, vi } from "vitest";

import { archiveCategory } from "./archive-category.use-case";
import { customRow, fakeCategoryRepo } from "./test-helpers";

function deps(opts?: { txnCount?: number; debtCount?: number; repo?: ReturnType<typeof fakeCategoryRepo> }) {
  return {
    userCategories: opts?.repo ?? fakeCategoryRepo(),
    transactions: {
      countByCategory: vi.fn(async () => opts?.txnCount ?? 0),
      reassignCategory: vi.fn(async () => undefined),
    },
    debts: {
      countByExpenseCategory: vi.fn(async () => opts?.debtCount ?? 0),
      reassignExpenseCategory: vi.fn(async () => undefined),
    },
  };
}

const base = { userId: "u1", profileId: "profile-1", isPro: true, domain: "expense" as const, destinationKey: null };

describe("archiveCategory", () => {
  it("Free não arquiva", async () => {
    await expect(
      archiveCategory(deps(), { ...base, isPro: false, key: "compras" }),
    ).rejects.toThrow(/Pro/);
  });

  it("outros é bloqueado", async () => {
    await expect(archiveCategory(deps(), { ...base, key: "outros" })).rejects.toThrow(
      /destino padrão/i,
    );
  });

  it("key inexistente falha", async () => {
    await expect(archiveCategory(deps(), { ...base, key: "nao-existe" })).rejects.toThrow(
      /encontrada/i,
    );
  });

  it("sem vínculos arquiva default via override", async () => {
    const d = deps();
    await archiveCategory(d, { ...base, key: "compras" });
    expect(d.userCategories.rows[0]).toMatchObject({ kind: "override", slug: "compras" });
    expect(d.userCategories.rows[0]?.archivedAt).toBeInstanceOf(Date);
    expect(d.transactions.reassignCategory).not.toHaveBeenCalled();
  });

  it("sem vínculos arquiva custom direto", async () => {
    const repo = fakeCategoryRepo([customRow({})]);
    const d = deps({ repo });
    await archiveCategory(d, { ...base, key: "cat-1" });
    expect(repo.rows[0]?.archivedAt).toBeInstanceOf(Date);
  });

  it("com vínculos e sem destino falha", async () => {
    await expect(
      archiveCategory(deps({ txnCount: 3 }), { ...base, key: "compras" }),
    ).rejects.toThrow(/pra onde/i);
  });

  it("destino igual à origem falha", async () => {
    await expect(
      archiveCategory(deps({ txnCount: 3 }), { ...base, key: "compras", destinationKey: "compras" }),
    ).rejects.toThrow(/diferente/i);
  });

  it("destino arquivado falha", async () => {
    const repo = fakeCategoryRepo([
      customRow({ id: "ov1", kind: "override", slug: "lazer", name: null, icon: null, archivedAt: new Date() }),
    ]);
    await expect(
      archiveCategory(deps({ txnCount: 3, repo }), { ...base, key: "compras", destinationKey: "lazer" }),
    ).rejects.toThrow(/inválida/i);
  });

  it("com vínculos move transações e dívidas e arquiva por último", async () => {
    const d = deps({ txnCount: 3, debtCount: 2 });
    await archiveCategory(d, { ...base, key: "compras", destinationKey: "outros" });
    expect(d.transactions.reassignCategory).toHaveBeenCalledWith("u1", "compras", "outros");
    expect(d.debts.reassignExpenseCategory).toHaveBeenCalledWith("profile-1", "compras", "outros");
    expect(d.userCategories.rows[0]?.archivedAt).toBeInstanceOf(Date);
  });

  it("domínio inflow não conta nem move dívidas", async () => {
    const d = deps({ txnCount: 1 });
    await archiveCategory(d, {
      ...base,
      domain: "inflow",
      key: "venda",
      destinationKey: "outros",
    });
    expect(d.debts.countByExpenseCategory).not.toHaveBeenCalled();
    expect(d.debts.reassignExpenseCategory).not.toHaveBeenCalled();
    expect(d.transactions.reassignCategory).toHaveBeenCalledWith("u1", "venda", "outros");
  });
});
