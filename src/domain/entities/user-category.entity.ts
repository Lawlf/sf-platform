import type { CategoryDomain } from "@/domain/categories/default-categories";

export type UserCategoryKind = "custom" | "override";

export interface UserCategoryEntity {
  id: string;
  userId: string;
  domain: CategoryDomain;
  kind: UserCategoryKind;
  slug: string;
  name: string | null;
  icon: string | null;
  archivedAt: Date | null;
  createdAt: Date;
}
