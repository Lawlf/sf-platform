export type HouseholdRole = "admin" | "member";
export type HouseholdInviteStatus = "pending" | "accepted" | "declined" | "revoked";
export type HouseholdShareLevel = "aggregate" | "detail";

export interface HouseholdEntity {
  id: string;
  name: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HouseholdMemberEntity {
  householdId: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: Date;
}

export interface HouseholdInviteEntity {
  id: string;
  householdId: string;
  invitedByUserId: string;
  inviteeRef: string;
  status: HouseholdInviteStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

export interface HouseholdMemberProfileEntity {
  householdId: string;
  userId: string;
  profileId: string;
  shareLevel: HouseholdShareLevel;
  createdAt: Date;
  updatedAt: Date;
}
