import type { UserCategoryEntity } from "@/domain/entities/user-category.entity";
import type { UserCategoryRepositoryPort } from "@/domain/ports/repositories/user-category.repository";

export function fakeCategoryRepo(initial: UserCategoryEntity[] = []) {
  const rows = [...initial];
  const repo: UserCategoryRepositoryPort & { rows: UserCategoryEntity[] } = {
    rows,
    listForUser: async () => [...rows],
    findByIdForUser: async (id) => rows.find((r) => r.id === id) ?? null,
    findOverride: async (_userId, domain, slug) =>
      rows.find((r) => r.kind === "override" && r.domain === domain && r.slug === slug) ?? null,
    create: async (e) => {
      const full = { ...e, createdAt: new Date() };
      rows.push(full);
      return full;
    },
    update: async (e) => {
      const i = rows.findIndex((r) => r.id === e.id);
      if (i === -1) throw new Error("not found");
      rows[i] = e;
      return e;
    },
  };
  return repo;
}

export function customRow(partial: Partial<UserCategoryEntity>): UserCategoryEntity {
  return {
    id: "cat-1",
    userId: "u1",
    domain: "expense",
    kind: "custom",
    slug: "cat-1",
    name: "Pet",
    icon: "PawPrint",
    archivedAt: null,
    createdAt: new Date("2026-01-01"),
    ...partial,
  };
}
