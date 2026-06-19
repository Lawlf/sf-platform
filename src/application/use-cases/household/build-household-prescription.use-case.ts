import {
  BASE_CURRENCY,
  convertAssetToBase,
  convertDebtToBase,
  convertIncomeToBase,
  type ConvertEntityDeps,
} from "@/application/use-cases/fx/convert-entity-to-base";
import { prescribeFromEntities } from "@/application/use-cases/prescription/prescribe-from-entities";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { Prescription } from "@/domain/services/prescription/prescription.types";
import { err, isErr, ok, type Result } from "@/shared/errors/result";

export interface BuildHouseholdPrescriptionDeps extends ConvertEntityDeps {
  households: Pick<
    HouseholdRepositoryPort,
    "findMembership" | "listSharedProfiles" | "listMembers"
  >;
  debts: Pick<DebtRepositoryPort, "listForProfile">;
  incomes: Pick<IncomeRepositoryPort, "listForProfile">;
  assets: Pick<AssetRepositoryPort, "findActiveByProfile">;
  now: () => Date;
}

export interface BuildHouseholdPrescriptionInput {
  householdId: string;
  userId: string;
}

export async function buildHouseholdPrescription(
  deps: BuildHouseholdPrescriptionDeps,
  input: BuildHouseholdPrescriptionInput,
): Promise<Result<Prescription, Forbidden | FxRateUnavailableError>> {
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

  const combinedDebts: DebtEntity[] = [];
  const combinedIncomes: IncomeEntity[] = [];
  const combinedAssets: AssetEntity[] = [];

  for (const share of activeShares) {
    const [rawDebts, rawIncomes, rawAssets] = await Promise.all([
      deps.debts.listForProfile(share.profileId, { status: "active" }),
      deps.incomes.listForProfile(share.profileId, { onlyActive: true }),
      deps.assets.findActiveByProfile(share.profileId),
    ]);

    for (const d of rawDebts) {
      const r = await convertDebtToBase(deps, share.userId, d, BASE_CURRENCY, now);
      if (isErr(r)) return r;
      combinedDebts.push(r.value);
    }

    for (const i of rawIncomes) {
      const r = await convertIncomeToBase(deps, share.userId, i, BASE_CURRENCY, now);
      if (isErr(r)) return r;
      combinedIncomes.push(r.value);
    }

    for (const a of rawAssets) {
      const r = await convertAssetToBase(deps, share.userId, a, BASE_CURRENCY, now);
      if (isErr(r)) return r;
      combinedAssets.push(r.value);
    }
  }

  const prescription = prescribeFromEntities({
    debts: combinedDebts,
    incomes: combinedIncomes,
    assets: combinedAssets,
    now,
  });

  return ok(prescription);
}
