import { describe, expect, it, vi } from "vitest";

import { categoryUsage } from "./category-usage.use-case";
import { listCategories } from "./list-categories.use-case";
import { unarchiveCategory } from "./unarchive-category.use-case";
import { customRow, fakeCategoryRepo } from "./test-helpers";

describe("listCategories", () => {
  it("devolve os dois domínios resolvidos", async () => {
    const repo = fakeCategoryRepo([customRow({})]);
    const r = await listCategories({ userCategories: repo }, { userId: "u1" });
    expect(r.expense).toHaveLength(12);
    expect(r.inflow).toHaveLength(5);
    expect(r.expense.at(-1)).toMatchObject({ key: "cat-1", label: "Pet" });
  });
});

describe("categoryUsage", () => {
  it("soma transações e dívidas em expense", async () => {
    const r = await categoryUsage(
      {
        transactions: { countByCategory: vi.fn(async () => 3) },
        debts: { countByExpenseCategory: vi.fn(async () => 2) },
      },
      { profileId: "profile-1", domain: "expense", key: "compras" },
    );
    expect(r).toEqual({ transactions: 3, debts: 2 });
  });

  it("inflow ignora dívidas", async () => {
    const countDebts = vi.fn(async () => 9);
    const r = await categoryUsage(
      {
        transactions: { countByCategory: vi.fn(async () => 1) },
        debts: { countByExpenseCategory: countDebts },
      },
      { profileId: "profile-1", domain: "inflow", key: "venda" },
    );
    expect(r).toEqual({ transactions: 1, debts: 0 });
    expect(countDebts).not.toHaveBeenCalled();
  });
});

describe("unarchiveCategory", () => {
  it("Free não desarquiva", async () => {
    const repo = fakeCategoryRepo();
    await expect(
      unarchiveCategory(
        { userCategories: repo },
        { userId: "u1", isPro: false, domain: "expense", key: "compras" },
      ),
    ).rejects.toThrow(/Pro/);
  });

  it("default arquivada limpa archivedAt do override", async () => {
    const repo = fakeCategoryRepo([
      customRow({ id: "ov1", kind: "override", slug: "compras", name: null, icon: null, archivedAt: new Date() }),
    ]);
    await unarchiveCategory(
      { userCategories: repo },
      { userId: "u1", isPro: true, domain: "expense", key: "compras" },
    );
    expect(repo.rows[0]?.archivedAt).toBeNull();
  });

  it("custom arquivada limpa archivedAt", async () => {
    const repo = fakeCategoryRepo([customRow({ archivedAt: new Date() })]);
    await unarchiveCategory(
      { userCategories: repo },
      { userId: "u1", isPro: true, domain: "expense", key: "cat-1" },
    );
    expect(repo.rows[0]?.archivedAt).toBeNull();
  });
});
