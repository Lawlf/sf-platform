import { and, eq } from "drizzle-orm";

import type { CategoryDomain } from "@/domain/categories/default-categories";
import type {
  UserCategoryEntity,
  UserCategoryKind,
} from "@/domain/entities/user-category.entity";
import type { UserCategoryRepositoryPort } from "@/domain/ports/repositories/user-category.repository";

import { getDb } from "../client";
import { type UserCategoryRow, userCategories } from "../schema/user-categories.schema";

function rowToEntity(row: UserCategoryRow): UserCategoryEntity {
  return {
    id: row.id,
    userId: row.userId,
    domain: row.domain as CategoryDomain,
    kind: row.kind as UserCategoryKind,
    slug: row.slug,
    name: row.name ?? null,
    icon: row.icon ?? null,
    archivedAt: row.archivedAt ?? null,
    createdAt: row.createdAt,
  };
}

export class UserCategoryRepository implements UserCategoryRepositoryPort {
  async listForUser(userId: string): Promise<UserCategoryEntity[]> {
    const rows = await getDb()
      .select()
      .from(userCategories)
      .where(eq(userCategories.userId, userId));
    return rows.map(rowToEntity);
  }

  async findByIdForUser(id: string, userId: string): Promise<UserCategoryEntity | null> {
    const rows = await getDb()
      .select()
      .from(userCategories)
      .where(and(eq(userCategories.id, id), eq(userCategories.userId, userId)))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async findOverride(
    userId: string,
    domain: CategoryDomain,
    slug: string,
  ): Promise<UserCategoryEntity | null> {
    const rows = await getDb()
      .select()
      .from(userCategories)
      .where(
        and(
          eq(userCategories.userId, userId),
          eq(userCategories.domain, domain),
          eq(userCategories.kind, "override"),
          eq(userCategories.slug, slug),
        ),
      )
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async create(entity: Omit<UserCategoryEntity, "createdAt">): Promise<UserCategoryEntity> {
    const rows = await getDb().insert(userCategories).values(entity).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert user category");
    return rowToEntity(row);
  }

  async update(entity: UserCategoryEntity): Promise<UserCategoryEntity> {
    const rows = await getDb()
      .update(userCategories)
      .set({ name: entity.name, icon: entity.icon, archivedAt: entity.archivedAt })
      .where(eq(userCategories.id, entity.id))
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to update user category");
    return rowToEntity(row);
  }
}
