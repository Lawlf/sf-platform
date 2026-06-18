import type { FinancialSnapshotEntity } from "@/domain/entities/financial-snapshot.entity";
import type { NetWorthSnapshot } from "@/domain/services/patrimony.service";
import {
  combineHouseholdSnapshot,
  type HouseholdSnapshotPart,
  type HouseholdSnapshotView,
} from "@/domain/services/household/household-aggregation.service";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { DomainError } from "@/shared/errors/domain-error";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { err, isErr, ok, type Result } from "@/shared/errors/result";

export interface BuildHouseholdSnapshotDeps {
  households: HouseholdRepositoryPort;
  profiles: ProfileRepositoryPort;
  getDashboardSnapshot: (
    deps: unknown,
    input: { userId: string; profileId: string },
  ) => Promise<Result<FinancialSnapshotEntity, DomainError>>;
  getNetWorth: (
    deps: unknown,
    input: { userId: string; profileId: string },
  ) => Promise<Result<NetWorthSnapshot, DomainError>>;
}

export interface BuildHouseholdSnapshotInput {
  householdId: string;
  userId: string;
}

export async function buildHouseholdSnapshot(
  deps: BuildHouseholdSnapshotDeps,
  input: BuildHouseholdSnapshotInput,
): Promise<Result<HouseholdSnapshotView, Forbidden | DomainError>> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não faz parte deste lar."));
  }

  const shares = await deps.households.listSharedProfiles(input.householdId);

  const parts: HouseholdSnapshotPart[] = [];

  for (const share of shares) {
    const snapshotResult = await deps.getDashboardSnapshot(null, {
      userId: share.userId,
      profileId: share.profileId,
    });
    if (isErr(snapshotResult)) return snapshotResult;

    const netWorthResult = await deps.getNetWorth(null, {
      userId: share.userId,
      profileId: share.profileId,
    });
    if (isErr(netWorthResult)) return netWorthResult;

    const snapshot = snapshotResult.value;
    const netWorthSnap = netWorthResult.value;

    const profile = await deps.profiles.findById(share.profileId);

    parts.push({
      profileId: share.profileId,
      ownerUserId: share.userId,
      displayName: profile?.displayName ?? null,
      shareLevel: share.shareLevel,
      incomeCents: snapshot.totalIncome.toCents(),
      debtBalanceCents: snapshot.totalDebtBalance.toCents(),
      monthlyServiceCents: snapshot.totalMonthlyService.toCents(),
      netWorthCents: netWorthSnap.netWorth.toCents(),
    });
  }

  return ok(combineHouseholdSnapshot(parts));
}
