import { describe, expect, it } from "vitest";

import { createCategory } from "./create-category.use-case";
import { customRow, fakeCategoryRepo } from "./test-helpers";

const base = { userId: "u1", isPro: true };

describe("createCategory", () => {
  it("Free não cria", async () => {
    const repo = fakeCategoryRepo();
    await expect(
      createCategory(
        { userCategories: repo },
        { ...base, isPro: false, input: { domain: "expense", name: "Pet", icon: "PawPrint" } },
      ),
    ).rejects.toThrow(/Pro/);
  });

  it("nome vazio falha", async () => {
    const repo = fakeCategoryRepo();
    await expect(
      createCategory(
        { userCategories: repo },
        { ...base, input: { domain: "expense", name: "   ", icon: "PawPrint" } },
      ),
    ).rejects.toThrow(/nome/i);
  });

  it("nome com mais de 24 caracteres falha", async () => {
    const repo = fakeCategoryRepo();
    await expect(
      createCategory(
        { userCategories: repo },
        { ...base, input: { domain: "expense", name: "a".repeat(25), icon: "PawPrint" } },
      ),
    ).rejects.toThrow(/24/);
  });

  it("nome duplicado de default (case-insensitive) falha", async () => {
    const repo = fakeCategoryRepo();
    await expect(
      createCategory(
        { userCategories: repo },
        { ...base, input: { domain: "expense", name: "moradia", icon: "House" } },
      ),
    ).rejects.toThrow(/existe/i);
  });

  it("nome duplicado de custom falha", async () => {
    const repo = fakeCategoryRepo([customRow({})]);
    await expect(
      createCategory(
        { userCategories: repo },
        { ...base, input: { domain: "expense", name: "PET", icon: "PawPrint" } },
      ),
    ).rejects.toThrow(/existe/i);
  });

  it("ícone fora da grade falha", async () => {
    const repo = fakeCategoryRepo();
    await expect(
      createCategory(
        { userCategories: repo },
        { ...base, input: { domain: "expense", name: "Pet", icon: "Skull" } },
      ),
    ).rejects.toThrow(/ícone/i);
  });

  it("cria custom com slug = id e nome trimado", async () => {
    const repo = fakeCategoryRepo();
    const created = await createCategory(
      { userCategories: repo },
      { ...base, input: { domain: "expense", name: "  Pet  ", icon: "PawPrint" } },
    );
    expect(created.kind).toBe("custom");
    expect(created.slug).toBe(created.id);
    expect(created.name).toBe("Pet");
    expect(repo.rows).toHaveLength(1);
  });
});
