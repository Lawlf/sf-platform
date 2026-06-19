import type { HouseholdMemberEntity } from "@/domain/entities/household.entity";

export function hasAdmin(members: HouseholdMemberEntity[]): boolean {
  return members.some((m) => m.role === "admin");
}

export interface NextAdminResult {
  dissolve: boolean;
  promoteUserId: string | null;
}

export function nextAdminAfterLeave(
  members: HouseholdMemberEntity[],
  leavingUserId: string,
): NextAdminResult {
  const remaining = members.filter((m) => m.userId !== leavingUserId);

  if (remaining.length === 0) {
    return { dissolve: true, promoteUserId: null };
  }

  if (remaining.some((m) => m.role === "admin")) {
    return { dissolve: false, promoteUserId: null };
  }

  const sorted = remaining.slice().sort((a, b) => {
    const diff = a.joinedAt.getTime() - b.joinedAt.getTime();
    if (diff !== 0) return diff;
    return a.userId < b.userId ? -1 : 1;
  });

  return { dissolve: false, promoteUserId: sorted[0]?.userId ?? null };
}
