import {
  BASE_CURRENCY,
  convertAssetToBase,
  convertDebtToBase,
  convertIncomeToBase,
  type ConvertEntityDeps,
} from "@/application/use-cases/fx/convert-entity-to-base";
import type { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { Prescription } from "@/domain/services/prescription/prescription.types";
import { isErr, ok, type Result } from "@/shared/errors/result";

import { prescribeFromEntities } from "./prescribe-from-entities";


export interface BuildPrescriptionDeps extends ConvertEntityDeps {
  debts: Pick<DebtRepositoryPort, "listForProfile">;
  incomes: Pick<IncomeRepositoryPort, "listForProfile">;
  assets: Pick<AssetRepositoryPort, "findActiveByProfile">;
  now: () => Date;
}

export interface BuildPrescriptionInput {
  userId: string;
  profileId: string;
}

export async function buildPrescription(
  deps: BuildPrescriptionDeps,
  input: BuildPrescriptionInput,
): Promise<Result<Prescription, FxRateUnavailableError>> {
  const now = deps.now();

  const [rawDebts, rawIncomes, rawAssets] = await Promise.all([
    deps.debts.listForProfile(input.profileId, { status: "active" }),
    deps.incomes.listForProfile(input.profileId, { onlyActive: true }),
    deps.assets.findActiveByProfile(input.profileId),
  ]);

  const debts: typeof rawDebts = [];
  for (const d of rawDebts) {
    const r = await convertDebtToBase(deps, input.userId, d, BASE_CURRENCY, now);
    if (isErr(r)) return r;
    debts.push(r.value);
  }

  const incomes: typeof rawIncomes = [];
  for (const i of rawIncomes) {
    const r = await convertIncomeToBase(deps, input.userId, i, BASE_CURRENCY, now);
    if (isErr(r)) return r;
    incomes.push(r.value);
  }

  const assets: typeof rawAssets = [];
  for (const a of rawAssets) {
    const r = await convertAssetToBase(deps, input.userId, a, BASE_CURRENCY, now);
    if (isErr(r)) return r;
    assets.push(r.value);
  }

  const prescription = prescribeFromEntities({ debts, incomes, assets, now });

  return ok(prescription);
}
