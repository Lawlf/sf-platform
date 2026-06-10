import { describe, expect, it } from "vitest";

import { renameCategory } from "./rename-category.use-case";
import { customRow, fakeCategoryRepo } from "./test-helpers";

const base = { userId: "u1", isPro: true, domain: "expense" as const };

describe("renameCategory", () => {
  it("Free não renomeia", async () => {
    const repo = fakeCategoryRepo();
    await expect(
      renameCategory(
        { userCategories: repo },
        { ...base, isPro: false, key: "compras", name: "Compras online" },
      ),
    ).rejects.toThrow(/Pro/);
  });

  it("key inexistente falha", async () => {
    const repo = fakeCategoryRepo();
    await expect(
      renameCategory({ userCategories: repo }, { ...base, key: "nao-existe", name: "X" }),
    ).rejects.toThrow(/encontrada/i);
  });

  it("default sem override cria override", async () => {
    const repo = fakeCategoryRepo();
    await renameCategory(
      { userCategories: repo },
      { ...base, key: "compras", name: "Compras online" },
    );
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({
      kind: "override",
      slug: "compras",
      name: "Compras online",
    });
  });

  it("default com override existente atualiza", async () => {
    const repo = fakeCategoryRepo([
      customRow({ id: "ov1", kind: "override", slug: "compras", name: "Antigo", icon: null }),
    ]);
    await renameCategory({ userCategories: repo }, { ...base, key: "compras", name: "Novo" });
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]?.name).toBe("Novo");
  });

  it("custom atualiza o name", async () => {
    const repo = fakeCategoryRepo([customRow({})]);
    await renameCategory({ userCategories: repo }, { ...base, key: "cat-1", name: "Cachorro" });
    expect(repo.rows[0]?.name).toBe("Cachorro");
  });

  it("renomear pro mesmo nome de outra categoria falha", async () => {
    const repo = fakeCategoryRepo([customRow({})]);
    await expect(
      renameCategory({ userCategories: repo }, { ...base, key: "cat-1", name: "Moradia" }),
    ).rejects.toThrow(/existe/i);
  });

  it("renomear mantendo o próprio nome (mudar caixa) passa", async () => {
    const repo = fakeCategoryRepo([customRow({})]);
    await renameCategory({ userCategories: repo }, { ...base, key: "cat-1", name: "PET" });
    expect(repo.rows[0]?.name).toBe("PET");
  });
});
