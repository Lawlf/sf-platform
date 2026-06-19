"use server";

import type { HouseholdInviteEntity, HouseholdMemberEntity, HouseholdShareLevel } from "@/domain/entities/household.entity";
import type { ProfileType } from "@/domain/entities/profile.entity";
import { buildHouseholdSnapshot } from "@/application/use-cases/household/build-household-snapshot.use-case";
import { buildHouseholdPrescription } from "@/application/use-cases/household/build-household-prescription.use-case";
import { buildHouseholdGap } from "@/application/use-cases/household/build-household-gap.use-case";
import { checkHouseholdHasPro } from "@/application/use-cases/household/check-household-has-pro.use-case";
import { getSharedProfileDetail } from "@/application/use-cases/household/get-shared-profile-detail.use-case";
import { listHouseholdGoals } from "@/application/use-cases/household/list-household-goals.use-case";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { getNetWorth } from "@/application/use-cases/asset/get-net-worth.use-case";
import type { MoveType, PrescriptionState } from "@/domain/services/prescription/prescription.types";
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

export type HouseholdSnapshotResult =
  | { gated: false; snapshot: HouseholdSnapshotPayload }
  | { gated: true; hasData: boolean }
  | null;

export async function fetchHouseholdSnapshot(
  householdId: string,
): Promise<HouseholdSnapshotResult> {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await repos.households.findMembership(householdId, user.id);
  if (!membership) return null;

  const hasPro = await checkHouseholdHasPro(
    { households: repos.households, users: repos.users },
    { householdId },
  );

  if (!hasPro) {
    const sharedProfiles = await repos.households.listSharedProfiles(householdId);
    return { gated: true, hasData: sharedProfiles.length > 0 };
  }

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
    gated: false,
    snapshot: {
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
    },
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
  etaMonths: number | null;
}

export async function fetchHouseholdGoals(
  householdId: string,
): Promise<SerializedHouseholdGoal[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await listHouseholdGoals(
    { households: repos.households, goals: repos.goals, contributions: repos.goalContributions, now: () => clock.now() },
    { householdId, userId: user.id },
  );

  if (!isOk(result)) return null;

  return result.value.map(({ goal, savedCents, targetCents, progressPct, etaMonths }) => ({
    id: goal.id,
    title: goal.title,
    savedBrl: formatCents(savedCents),
    targetBrl: targetCents !== null ? formatCents(targetCents) : null,
    savedCents: savedCents.toString(),
    targetCents: targetCents !== null ? targetCents.toString() : null,
    progressPct,
    etaMonths,
  }));
}

export interface SerializedHouseholdGoalForPersonalView {
  id: string;
  householdId: string;
  householdName: string;
  title: string;
  savedBrl: string;
  targetBrl: string | null;
  progressPct: number | null;
}

export async function fetchMyHouseholdGoals(): Promise<SerializedHouseholdGoalForPersonalView[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const households = await repos.households.listHouseholdsForUser(user.id);
  if (households.length === 0) return [];

  const perHousehold = await Promise.all(
    households.map(async (h) => {
      const result = await listHouseholdGoals(
        { households: repos.households, goals: repos.goals, contributions: repos.goalContributions, now: () => clock.now() },
        { householdId: h.id, userId: user.id },
      );
      if (!isOk(result)) return [];
      return result.value.map(({ goal, savedCents, targetCents, progressPct }) => ({
        id: goal.id,
        householdId: h.id,
        householdName: h.name,
        title: goal.title,
        savedBrl: formatCents(savedCents),
        targetBrl: targetCents !== null ? formatCents(targetCents) : null,
        progressPct,
      }));
    }),
  );

  return perHousehold.flat();
}

export interface HouseholdInsightPayload {
  state: PrescriptionState;
  dominantType: MoveType | null;
  dominantHeadline: string | null;
  dominantImpact: string | null;
}

export interface HouseholdGapMemberPayload {
  profileId: string;
  displayName: string | null;
  jaRecebidoBrl: string;
  aReceberConfirmadoBrl: string;
  suggestedShareBrl: string | null;
}

export interface HouseholdGapPayload {
  custosGarantidosBrl: string;
  jaRecebidoBrl: string;
  aReceberConfirmadoBrl: string;
  aReceberEstimadoBrl: string;
  gapBrl: string;
  gapCents: string;
  porMembro: HouseholdGapMemberPayload[];
}

export type HouseholdGapResult =
  | { gated: false; gap: HouseholdGapPayload }
  | { gated: true; hasData: boolean }
  | null;

export async function fetchHouseholdGap(householdId: string): Promise<HouseholdGapResult> {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await repos.households.findMembership(householdId, user.id);
  if (!membership) return null;

  const hasPro = await checkHouseholdHasPro(
    { households: repos.households, users: repos.users },
    { householdId },
  );

  if (!hasPro) {
    const sharedProfiles = await repos.households.listSharedProfiles(householdId);
    return { gated: true, hasData: sharedProfiles.length > 0 };
  }

  const result = await buildHouseholdGap(
    {
      households: repos.households,
      debts: repos.debts,
      incomes: repos.incomes,
      incomeSettlements: repos.incomeSettlements,
      profiles: repos.profiles,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
      clock,
      now: () => clock.now(),
    },
    { householdId, userId: user.id },
  );

  if (!isOk(result)) return null;
  const g = result.value;

  return {
    gated: false,
    gap: {
      custosGarantidosBrl: formatCents(g.custosGarantidosCents),
      jaRecebidoBrl: formatCents(g.jaRecebidoCents),
      aReceberConfirmadoBrl: formatCents(g.aReceberConfirmadoCents),
      aReceberEstimadoBrl: formatCents(g.aReceberEstimadoCents),
      gapBrl: formatCents(g.gapCents < 0n ? -g.gapCents : g.gapCents),
      gapCents: g.gapCents.toString(),
      porMembro: g.porMembro.map((pm) => ({
        profileId: pm.profileId,
        displayName: pm.displayName,
        jaRecebidoBrl: formatCents(pm.jaRecebidoCents),
        aReceberConfirmadoBrl: formatCents(pm.aReceberConfirmadoCents),
        suggestedShareBrl: pm.suggestedShareCents !== null ? formatCents(pm.suggestedShareCents) : null,
      })),
    },
  };
}

export async function fetchHouseholdInsight(
  householdId: string,
): Promise<HouseholdInsightPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await repos.households.findMembership(householdId, user.id);
  if (!membership) return null;

  const hasPro = await checkHouseholdHasPro(
    { households: repos.households, users: repos.users },
    { householdId },
  );
  if (!hasPro) return null;

  const result = await buildHouseholdPrescription(
    {
      households: repos.households,
      debts: repos.debts,
      incomes: repos.incomes,
      assets: repos.assets,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
      clock,
      now: () => clock.now(),
    },
    { householdId, userId: user.id },
  );

  if (!isOk(result)) return null;

  const p = result.value;
  if (p.state === "incomplete" || !p.dominant) return null;

  const dom = p.dominant;

  const brl = (reais: number): string =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      Math.round(reais * 100) / 100,
    );

  const monthsLabel = (n: number): string => (n === 1 ? "1 mês" : `${n} meses`);

  let headline = "";
  let impact = "";

  switch (dom.type) {
    case "pay_debt": {
      const label = dom.targetDebtLabel ?? "a dívida mais cara";
      headline = `Coloquem a sobra na ${label} primeiro.`;
      if (dom.metrics.baselineNeverPayoff) {
        const months = dom.metrics.monthsToPayoff;
        impact =
          months != null
            ? `Pagando só o mínimo, ela não quita. Com a sobra da casa, vocês zeram em ${monthsLabel(months)}.`
            : "Pagando só o mínimo, o saldo não cai. A sobra da casa acelera a quitação.";
      } else {
        const saved = dom.metrics.interestSavedReais ?? 0;
        const months = dom.metrics.monthsSaved ?? 0;
        impact = `A casa economiza ${brl(saved)} em juros e antecipa a quitação em ${monthsLabel(months)}.`;
      }
      break;
    }
    case "build_reserve": {
      const gap = dom.metrics.reserveGapReais ?? 0;
      const months = dom.metrics.monthsToReserve;
      const minSafety = dom.reasonCode === "below_min_safety";
      headline = minSafety
        ? "Juntem um colchão antes de atacar as dívidas."
        : "Direcionem a sobra para a reserva de emergência.";
      impact =
        months == null
          ? `Faltam ${brl(gap)} para o colchão da casa ficar completo.`
          : `Faltam ${brl(gap)}, cerca de ${monthsLabel(months)} no ritmo atual.`;
      break;
    }
    case "invest": {
      const monthly = dom.metrics.monthlyContributionReais ?? 0;
      const growth = dom.metrics.projectedGrowthReais ?? 0;
      headline = `A sobra da casa pode render: comecem com ${brl(monthly)} por mês.`;
      impact = `Em 12 meses, isso pode render cerca de ${brl(growth)}.`;
      break;
    }
    case "reduce_commitment": {
      const cut = dom.metrics.targetReductionReais ?? 0;
      const negative = dom.reasonCode === "negative_free_balance";
      headline = negative
        ? "Cortem um gasto fixo: hoje sai mais do que entra na casa."
        : "Cortem um gasto fixo para sobrar mais por mês.";
      impact = `Cortar cerca de ${brl(cut)} por mês já reequilibra as contas da casa.`;
      break;
    }
  }

  return {
    state: p.state,
    dominantType: dom.type,
    dominantHeadline: headline,
    dominantImpact: impact,
  };
}
