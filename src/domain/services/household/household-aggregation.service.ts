import type { HouseholdShareLevel } from "@/domain/entities/household.entity";

export interface HouseholdSnapshotPart {
  profileId: string;
  ownerUserId: string;
  displayName: string | null;
  shareLevel: HouseholdShareLevel;
  incomeCents: bigint;
  debtBalanceCents: bigint;
  monthlyServiceCents: bigint;
  netWorthCents: bigint;
}

export interface HouseholdSnapshotContribution {
  profileId: string;
  displayName: string | null;
  shareLevel: HouseholdShareLevel;
  incomeCents: bigint;
  debtBalanceCents: bigint;
  netWorthCents: bigint;
}

export interface HouseholdSnapshotView {
  totalIncomeCents: bigint;
  totalDebtBalanceCents: bigint;
  totalMonthlyServiceCents: bigint;
  freeCents: bigint;
  committedPctBps: bigint;
  netWorthCents: bigint;
  contributions: HouseholdSnapshotContribution[];
}

export function combineHouseholdSnapshot(parts: HouseholdSnapshotPart[]): HouseholdSnapshotView {
  let totalIncomeCents = 0n;
  let totalDebtBalanceCents = 0n;
  let totalMonthlyServiceCents = 0n;
  let netWorthCents = 0n;

  for (const part of parts) {
    totalIncomeCents += part.incomeCents;
    totalDebtBalanceCents += part.debtBalanceCents;
    totalMonthlyServiceCents += part.monthlyServiceCents;
    netWorthCents += part.netWorthCents;
  }

  const freeCents = totalIncomeCents - totalMonthlyServiceCents;
  const committedPctBps =
    totalIncomeCents === 0n
      ? 0n
      : (totalMonthlyServiceCents * 10_000n) / totalIncomeCents;

  const contributions: HouseholdSnapshotContribution[] = parts.map((p) => ({
    profileId: p.profileId,
    displayName: p.displayName,
    shareLevel: p.shareLevel,
    incomeCents: p.incomeCents,
    debtBalanceCents: p.debtBalanceCents,
    netWorthCents: p.netWorthCents,
  }));

  return {
    totalIncomeCents,
    totalDebtBalanceCents,
    totalMonthlyServiceCents,
    freeCents,
    committedPctBps,
    netWorthCents,
    contributions,
  };
}
