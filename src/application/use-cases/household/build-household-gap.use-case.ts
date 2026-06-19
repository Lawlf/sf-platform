import {
  BASE_CURRENCY,
  convertDebtToBase,
  convertIncomeToBase,
  type ConvertEntityDeps,
} from "@/application/use-cases/fx/convert-entity-to-base";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { IncomeSettlementRepositoryPort } from "@/domain/ports/repositories/income-settlement.repository";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import {
  monthGapPieces,
  type MonthGapPieces,
} from "@/domain/services/household/month-gap.service";
import { err, isErr, ok, type Result } from "@/shared/errors/result";

export interface BuildHouseholdGapDeps extends ConvertEntityDeps {
  households: Pick<
    HouseholdRepositoryPort,
    "findMembership" | "listSharedProfiles" | "listMembers"
  >;
  debts: Pick<DebtRepositoryPort, "listForProfile">;
  incomes: Pick<IncomeRepositoryPort, "listForProfile">;
  incomeSettlements: Pick<IncomeSettlementRepositoryPort, "listForProfileMonth">;
  profiles: Pick<ProfileRepositoryPort, "findById">;
  now: () => Date;
}

export interface BuildHouseholdGapInput {
  householdId: string;
  userId: string;
}

export interface HouseholdGapMember {
  profileId: string;
  displayName: string | null;
  jaRecebidoCents: bigint;
  aReceberConfirmadoCents: bigint;
  suggestedShareCents: bigint | null;
}

export interface HouseholdGap {
  custosGarantidosCents: bigint;
  jaRecebidoCents: bigint;
  aReceberConfirmadoCents: bigint;
  aReceberEstimadoCents: bigint;
  gapCents: bigint;
  porMembro: HouseholdGapMember[];
}

interface RawMemberForShare {
  profileId: string;
  displayName: string | null;
  jaRecebidoCents: bigint;
  aReceberConfirmadoCents: bigint;
}

function computeSuggestedShares(
  rawMembers: RawMemberForShare[],
  gapCents: bigint,
): HouseholdGapMember[] {
  const membersWithIncome = rawMembers.filter(
    (m) => m.jaRecebidoCents + m.aReceberConfirmadoCents > 0n,
  );

  if (gapCents <= 0n || membersWithIncome.length < 2) {
    return rawMembers.map((m) => ({ ...m, suggestedShareCents: null }));
  }

  const totalRendaCents = membersWithIncome.reduce(
    (sum, m) => sum + m.jaRecebidoCents + m.aReceberConfirmadoCents,
    0n,
  );

  if (totalRendaCents <= 0n) {
    return rawMembers.map((m) => ({ ...m, suggestedShareCents: null }));
  }

  const memberSet = new Set(membersWithIncome.map((m) => m.profileId));
  let allocated = 0n;
  const shares: HouseholdGapMember[] = [];

  for (let i = 0; i < rawMembers.length; i++) {
    const m = rawMembers[i]!;
    if (!memberSet.has(m.profileId)) {
      shares.push({ ...m, suggestedShareCents: null });
      continue;
    }
    const isLast = i === rawMembers.length - 1 || !rawMembers.slice(i + 1).some((x) => memberSet.has(x.profileId));
    let share: bigint;
    if (isLast) {
      share = gapCents - allocated;
    } else {
      const renda = m.jaRecebidoCents + m.aReceberConfirmadoCents;
      share = (gapCents * renda) / totalRendaCents;
      allocated += share;
    }
    shares.push({ ...m, suggestedShareCents: share });
  }

  return shares;
}

export async function buildHouseholdGap(
  deps: BuildHouseholdGapDeps,
  input: BuildHouseholdGapInput,
): Promise<Result<HouseholdGap, Forbidden | FxRateUnavailableError>> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não faz parte deste lar."));
  }

  const now = deps.now();

  const [shares, members] = await Promise.all([
    deps.households.listSharedProfiles(input.householdId),
    deps.households.listMembers(input.householdId),
  ]);

  const memberIds = new Set(members.map((m) => m.userId));
  const activeShares = shares.filter((s) => memberIds.has(s.userId));

  let totalCustos = 0n;
  let totalJaRecebido = 0n;
  let totalAReceberConfirmado = 0n;
  let totalAReceberEstimado = 0n;

  const rawMembers: RawMemberForShare[] = [];

  for (const share of activeShares) {
    const [rawDebts, rawIncomes, settlements] = await Promise.all([
      deps.debts.listForProfile(share.profileId, { status: "active" }),
      deps.incomes.listForProfile(share.profileId, { onlyActive: true }),
      deps.incomeSettlements.listForProfileMonth(share.profileId, now),
    ]);

    const convertedDebts: DebtEntity[] = [];
    for (const d of rawDebts) {
      const r = await convertDebtToBase(deps, share.userId, d, BASE_CURRENCY, now);
      if (isErr(r)) return r;
      convertedDebts.push(r.value);
    }

    const convertedIncomes: IncomeEntity[] = [];
    for (const i of rawIncomes) {
      const r = await convertIncomeToBase(deps, share.userId, i, BASE_CURRENCY, now);
      if (isErr(r)) return r;
      convertedIncomes.push(r.value);
    }

    const pieces: MonthGapPieces = monthGapPieces({
      debts: convertedDebts,
      incomes: convertedIncomes,
      settlements,
      now,
    });

    totalCustos += pieces.custosGarantidosCents;
    totalJaRecebido += pieces.jaRecebidoCents;
    totalAReceberConfirmado += pieces.aReceberConfirmadoCents;
    totalAReceberEstimado += pieces.aReceberEstimadoCents;

    const profile = await deps.profiles.findById(share.profileId);

    rawMembers.push({
      profileId: share.profileId,
      displayName: profile?.displayName ?? null,
      jaRecebidoCents: pieces.jaRecebidoCents,
      aReceberConfirmadoCents: pieces.aReceberConfirmadoCents,
    });
  }

  const gapCents = totalCustos - totalJaRecebido - totalAReceberConfirmado;

  const porMembro: HouseholdGapMember[] = computeSuggestedShares(rawMembers, gapCents);

  return ok({
    custosGarantidosCents: totalCustos,
    jaRecebidoCents: totalJaRecebido,
    aReceberConfirmadoCents: totalAReceberConfirmado,
    aReceberEstimadoCents: totalAReceberEstimado,
    gapCents,
    porMembro,
  });
}
