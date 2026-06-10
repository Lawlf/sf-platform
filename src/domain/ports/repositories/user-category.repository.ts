import type { CategoryDomain } from "@/domain/categories/default-categories";
import type { UserCategoryEntity } from "@/domain/entities/user-category.entity";

export interface UserCategoryRepositoryPort {
  listForUser(userId: string): Promise<UserCategoryEntity[]>;
  findByIdForUser(id: string, userId: string): Promise<UserCategoryEntity | null>;
  findOverride(
    userId: string,
    domain: CategoryDomain,
    slug: string,
  ): Promise<UserCategoryEntity | null>;
  create(entity: Omit<UserCategoryEntity, "createdAt">): Promise<UserCategoryEntity>;
  update(entity: UserCategoryEntity): Promise<UserCategoryEntity>;
}
