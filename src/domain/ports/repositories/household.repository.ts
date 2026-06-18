import type {
  HouseholdEntity,
  HouseholdInviteEntity,
  HouseholdInviteStatus,
  HouseholdMemberEntity,
  HouseholdRole,
} from "@/domain/entities/household.entity";

export interface HouseholdRepositoryPort {
  createHousehold(input: {
    id: string;
    name: string;
    createdByUserId: string;
    now: Date;
  }): Promise<HouseholdEntity>;

  addMember(input: {
    householdId: string;
    userId: string;
    role: HouseholdRole;
    now: Date;
  }): Promise<void>;

  removeMember(householdId: string, userId: string): Promise<void>;

  setRole(householdId: string, userId: string, role: HouseholdRole): Promise<void>;

  listMembers(householdId: string): Promise<HouseholdMemberEntity[]>;

  findMembership(householdId: string, userId: string): Promise<HouseholdMemberEntity | null>;

  listHouseholdsForUser(userId: string): Promise<HouseholdEntity[]>;

  findHousehold(id: string): Promise<HouseholdEntity | null>;

  deleteHousehold(id: string): Promise<void>;

  createInvite(input: {
    id: string;
    householdId: string;
    invitedByUserId: string;
    inviteeRef: string;
    now: Date;
  }): Promise<HouseholdInviteEntity>;

  findInvite(id: string): Promise<HouseholdInviteEntity | null>;

  listPendingInvitesForRef(inviteeRef: string): Promise<HouseholdInviteEntity[]>;

  listPendingInvitesForHousehold(householdId: string): Promise<HouseholdInviteEntity[]>;

  setInviteStatus(id: string, status: HouseholdInviteStatus, now: Date): Promise<void>;
}
