import { describe, expect, it } from "vitest";

import type { UserCategoryEntity } from "@/domain/entities/user-category.entity";

import { activeCategories, categoryLabel, resolveCategories } from "./resolve-categories";

function row(partial: Partial<UserCategoryEntity>): UserCategoryEntity {
  return {
    id: "c1",
    userId: "u1",
    domain: "expense",
    kind: "custom",
    slug: "c1",
    name: "Pet",
    icon: "PawPrint",
    archivedAt: null,
    createdAt: new Date("2026-01-01"),
    ...partial,
  };
}

describe("resolveCategories", () => {
  it("sem linhas devolve os defaults na ordem", () => {
    const r = resolveCategories("expense", []);
    expect(r[0]).toMatchObject({
      key: "moradia",
      label: "Moradia",
      isDefault: true,
      archived: false,
    });
    expect(r.at(-1)).toMatchObject({ key: "outros" });
    expect(r).toHaveLength(11);
  });

  it("inflow tem o próprio set", () => {
    const r = resolveCategories("inflow", []);
    expect(r.map((c) => c.key)).toEqual([
      "transferencia",
      "presente",
      "reembolso",
      "venda",
      "outros",
    ]);
  });

  it("override de rename troca o label e preserva o ícone default", () => {
    const r = resolveCategories("expense", [
      row({ kind: "override", slug: "compras", name: "Compras online", icon: null }),
    ]);
    const compras = r.find((c) => c.key === "compras");
    expect(compras).toMatchObject({ label: "Compras online", icon: "ShoppingBag" });
  });

  it("override de archive marca archived sem sumir da resolução", () => {
    const r = resolveCategories("expense", [
      row({ kind: "override", slug: "lazer", name: null, icon: null, archivedAt: new Date() }),
    ]);
    expect(r.find((c) => c.key === "lazer")?.archived).toBe(true);
    expect(activeCategories(r).some((c) => c.key === "lazer")).toBe(false);
  });

  it("custom entra no fim com key = id", () => {
    const r = resolveCategories("expense", [row({ id: "abc", slug: "abc" })]);
    expect(r.at(-1)).toMatchObject({
      key: "abc",
      label: "Pet",
      icon: "PawPrint",
      isDefault: false,
    });
  });

  it("customs ordenadas por criação", () => {
    const r = resolveCategories("expense", [
      row({ id: "b", slug: "b", name: "Filhos", createdAt: new Date("2026-02-01") }),
      row({ id: "a", slug: "a", name: "Pet", createdAt: new Date("2026-01-01") }),
    ]);
    expect(r.slice(-2).map((c) => c.label)).toEqual(["Pet", "Filhos"]);
  });

  it("linhas de outro domínio não vazam", () => {
    const r = resolveCategories("expense", [row({ id: "x", slug: "x", domain: "inflow" })]);
    expect(r).toHaveLength(11);
  });

  it("categoryLabel resolve default, custom, órfã e null", () => {
    const r = resolveCategories("expense", [row({ id: "abc", slug: "abc" })]);
    expect(categoryLabel("saude", r)).toBe("Saúde");
    expect(categoryLabel("abc", r)).toBe("Pet");
    expect(categoryLabel("Cafezinho antigo", r)).toBe("Cafezinho antigo");
    expect(categoryLabel(null, r)).toBe("Sem categoria");
  });
});
