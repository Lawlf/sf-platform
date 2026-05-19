export type UserRole = "user" | "admin";
export type UserPlan = "free" | "pro";

export interface UserEntity {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string | null;
  role: UserRole;
  plan: UserPlan;
  deactivatedAt: Date | null;
  deactivationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function isActive(user: UserEntity): boolean {
  return user.deactivatedAt === null;
}
