"use server";

import type { HouseholdInviteEntity, HouseholdMemberEntity, HouseholdShareLevel } from "@/domain/entities/household.entity";
import type { ProfileType } from "@/domain/entities/profile.entity";
import { repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

export interface SerializedHousehold {
  id: string;
  name: string;
  createdByUserId: string;
  createdAtIso: string;
}

export interface SerializedMember {
  userId: string;
  role: "admin" | "member";
  joinedAtIso: string;
  displayName: string | null;
  username: string | null;
  email: string;
}

export interface SerializedInvite {
  id: string;
  householdId: string;
  householdName: string;
  invitedByUserId: string;
  inviteeRef: string;
  status: string;
  createdAtIso: string;
}

function serializeHousehold(h: { id: string; name: string; createdByUserId: string; createdAt: Date }): SerializedHousehold {
  return {
    id: h.id,
    name: h.name,
    createdByUserId: h.createdByUserId,
    createdAtIso: h.createdAt.toISOString(),
  };
}

function serializeMember(m: HouseholdMemberEntity, userInfo: { displayName: string | null; username: string | null; email: string }): SerializedMember {
  return {
    userId: m.userId,
    role: m.role,
    joinedAtIso: m.joinedAt.toISOString(),
    displayName: userInfo.displayName,
    username: userInfo.username,
    email: userInfo.email,
  };
}

export async function fetchMyHouseholds(): Promise<SerializedHousehold[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const households = await repos.households.listHouseholdsForUser(user.id);
  return households.map(serializeHousehold);
}

export async function fetchHouseholdMembers(householdId: string): Promise<SerializedMember[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await repos.households.findMembership(householdId, user.id);
  if (!membership) return null;

  const members = await repos.households.listMembers(householdId);

  const userInfos = await Promise.all(
    members.map((m) => repos.users.findById(m.userId)),
  );

  return members.map((m, i) => {
    const u = userInfos[i];
    return serializeMember(m, {
      displayName: u?.displayName ?? null,
      username: u?.username ?? null,
      email: u?.email ?? "",
    });
  });
}

export async function fetchHouseholdPendingInvites(
  householdId: string,
): Promise<{ id: string; inviteeRef: string }[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await repos.households.findMembership(householdId, user.id);
  if (!membership || membership.role !== "admin") return null;

  const invites = await repos.households.listPendingInvitesForHousehold(householdId);
  return invites.map((inv) => ({ id: inv.id, inviteeRef: inv.inviteeRef }));
}

export async function fetchMyPendingInvites(): Promise<SerializedInvite[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const refs: string[] = [user.email];
  if (user.username) refs.push(`@${user.username}`);

  const inviteLists = await Promise.all(
    refs.map((ref) => repos.households.listPendingInvitesForRef(ref)),
  );

  const seen = new Set<string>();
  const invites: HouseholdInviteEntity[] = [];
  for (const list of inviteLists) {
    for (const inv of list) {
      if (!seen.has(inv.id)) {
        seen.add(inv.id);
        invites.push(inv);
      }
    }
  }

  const households = await Promise.all(
    invites.map((inv) => repos.households.findHousehold(inv.householdId)),
  );

  return invites.map((inv, i) => ({
    id: inv.id,
    householdId: inv.householdId,
    householdName: households[i]?.name ?? "",
    invitedByUserId: inv.invitedByUserId,
    inviteeRef: inv.inviteeRef,
    status: inv.status,
    createdAtIso: inv.createdAt.toISOString(),
  }));
}

export interface SerializedSharedProfile {
  profileId: string;
  shareLevel: HouseholdShareLevel;
}

export interface SerializedProfileOption {
  id: string;
  type: ProfileType;
  displayName: string | null;
  isPrimary: boolean;
}

export interface MySharesData {
  shares: SerializedSharedProfile[];
  profiles: SerializedProfileOption[];
}

export async function fetchMyShares(householdId: string): Promise<MySharesData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await repos.households.findMembership(householdId, user.id);
  if (!membership) return null;

  const [shares, profiles] = await Promise.all([
    repos.households.listSharedProfilesForUser(householdId, user.id),
    repos.profiles.listForUser(user.id),
  ]);

  return {
    shares: shares.map((s) => ({ profileId: s.profileId, shareLevel: s.shareLevel })),
    profiles: profiles.map((p) => ({
      id: p.id,
      type: p.type,
      displayName: p.displayName,
      isPrimary: p.isPrimary,
    })),
  };
}
