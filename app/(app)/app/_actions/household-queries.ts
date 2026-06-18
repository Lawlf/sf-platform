"use server";

import type { HouseholdInviteEntity, HouseholdMemberEntity, HouseholdShareLevel } from "@/domain/entities/household.entity";
import type { ProfileType } from "@/domain/entities/profile.entity";
import { buildHouseholdSnapshot } from "@/application/use-cases/household/build-household-snapshot.use-case";
import { getSharedProfileDetail } from "@/application/use-cases/household/get-shared-profile-detail.use-case";
import { listHouseholdGoals } from "@/application/use-cases/household/list-household-goals.use-case";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { getNetWorth } from "@/application/use-cases/asset/get-net-worth.use-case";
import { clock, repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";
import { formatCents } from "@/shared/format/money-format";

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

export interface SerializedContribution {
  profileId: string;
  displayName: string | null;
  shareLevel: HouseholdShareLevel;
  incomeBrl: string;
  debtBalanceBrl: string;
  netWorthBrl: string;
}

export interface HouseholdSnapshotPayload {
  totalIncomeBrl: string;
  totalDebtBalanceBrl: string;
  totalMonthlyServiceBrl: string;
  freeBrl: string;
  committedPct: number;
  netWorthBrl: string;
  contributions: SerializedContribution[];
}

export async function fetchHouseholdSnapshot(
  householdId: string,
): Promise<HouseholdSnapshotPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await buildHouseholdSnapshot(
    {
      households: repos.households,
      profiles: repos.profiles,
      getDashboardSnapshot: (_, input) =>
        getDashboardSnapshot(
          { debts: repos.debts, incomes: repos.incomes, clock, rates: repos.exchangeRates, overrides: repos.userFxOverrides },
          input as { userId: string; profileId: string },
        ),
      getNetWorth: (_, input) =>
        getNetWorth(
          { assets: repos.assets, allocations: repos.assetDebtAllocations, debts: repos.debts, rates: repos.exchangeRates, overrides: repos.userFxOverrides, clock },
          input as { userId: string; profileId: string },
        ),
    },
    { householdId, userId: user.id },
  );

  if (!isOk(result)) return null;
  const v = result.value;

  return {
    totalIncomeBrl: formatCents(v.totalIncomeCents),
    totalDebtBalanceBrl: formatCents(v.totalDebtBalanceCents),
    totalMonthlyServiceBrl: formatCents(v.totalMonthlyServiceCents),
    freeBrl: formatCents(v.freeCents),
    committedPct:
      v.totalIncomeCents === 0n
        ? 0
        : Math.round(Number(v.committedPctBps) / 100),
    netWorthBrl: formatCents(v.netWorthCents),
    contributions: v.contributions.map((c) => ({
      profileId: c.profileId,
      displayName: c.displayName,
      shareLevel: c.shareLevel,
      incomeBrl: formatCents(c.incomeCents),
      debtBalanceBrl: formatCents(c.debtBalanceCents),
      netWorthBrl: formatCents(c.netWorthCents),
    })),
  };
}

export interface SerializedIncomeItem {
  id: string;
  label: string;
  amountBrl: string;
  frequency: string;
  isEstimated: boolean;
}

export interface SerializedDebtItem {
  id: string;
  label: string;
  balanceBrl: string;
  status: string;
}

export interface SharedProfileDetailPayload {
  incomes: SerializedIncomeItem[];
  debts: SerializedDebtItem[];
}

export async function fetchSharedProfileDetail(
  householdId: string,
  profileId: string,
): Promise<SharedProfileDetailPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await getSharedProfileDetail(
    { households: repos.households, incomes: repos.incomes, debts: repos.debts },
    { householdId, userId: user.id, profileId },
  );

  if (!isOk(result)) return null;
  const { incomes, debts } = result.value;

  return {
    incomes: incomes
      .filter((i) => !i.deletedAt && i.isActive)
      .map((i) => ({
        id: i.id,
        label: i.label,
        amountBrl: formatCents(i.amount.toCents()),
        frequency: i.frequency,
        isEstimated: i.isEstimated,
      })),
    debts: debts
      .filter((d) => !d.deletedAt && d.status !== "paid_off")
      .map((d) => ({
        id: d.id,
        label: d.label,
        balanceBrl: formatCents(d.currentBalance.toCents()),
        status: d.status,
      })),
  };
}

export interface SerializedHouseholdGoal {
  id: string;
  title: string;
  savedBrl: string;
  targetBrl: string | null;
  savedCents: string;
  targetCents: string | null;
  progressPct: number | null;
}

export async function fetchHouseholdGoals(
  householdId: string,
): Promise<SerializedHouseholdGoal[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await listHouseholdGoals(
    { households: repos.households, goals: repos.goals, contributions: repos.goalContributions },
    { householdId, userId: user.id },
  );

  if (!isOk(result)) return null;

  return result.value.map(({ goal, savedCents, targetCents, progressPct }) => ({
    id: goal.id,
    title: goal.title,
    savedBrl: formatCents(savedCents),
    targetBrl: targetCents !== null ? formatCents(targetCents) : null,
    savedCents: savedCents.toString(),
    targetCents: targetCents !== null ? targetCents.toString() : null,
    progressPct,
  }));
}
