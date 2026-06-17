import {
  BASE_CURRENCY,
  convertAssetToBase,
  convertDebtToBase,
  convertIncomeToBase,
  type ConvertEntityDeps,
} from "@/application/use-cases/fx/convert-entity-to-base";
import { PRESCRIPTION_CONFIG } from "@/domain/config/prescription-config";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { monthlyDebtService } from "@/domain/services/financial-health.service";
import { PrescriptionEngine } from "@/domain/services/prescription/prescription-engine.service";
import type { Prescription } from "@/domain/services/prescription/prescription.types";
import { isErr, isOk, ok, type Result } from "@/shared/errors/result";


export interface BuildPrescriptionDeps extends ConvertEntityDeps {
  debts: Pick<DebtRepositoryPort, "listForUser">;
  incomes: Pick<IncomeRepositoryPort, "listForProfile">;
  assets: Pick<AssetRepositoryPort, "findActiveByUser">;
  now: () => Date;
}

export interface BuildPrescriptionInput {
  userId: string;
}

export async function buildPrescription(
  deps: BuildPrescriptionDeps,
  input: BuildPrescriptionInput,
): Promise<Result<Prescription, FxRateUnavailableError>> {
  const now = deps.now();

  const [rawDebts, rawIncomes, rawAssets] = await Promise.all([
    deps.debts.listForUser(input.userId, { status: "active" }),
    deps.incomes.listForProfile(input.userId, { onlyActive: true }),
    deps.assets.findActiveByUser(input.userId),
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

  const monthlyIncomeReais = incomes.reduce(
    (sum, i) => sum + monthlyIncomeOf(i, now),
    0,
  );

  let monthlyDebtTotal = 0;
  let monthlyEssential = 0;
  for (const d of debts) {
    const svc = monthlyDebtService(d);
    const v = isOk(svc) ? svc.value : 0;
    monthlyDebtTotal += v;
    if (d.kind === "recurring") monthlyEssential += v;
  }

  const freeBalanceReais = monthlyIncomeReais - monthlyDebtTotal;
  const committedPct =
    monthlyIncomeReais > 0
      ? (monthlyDebtTotal / monthlyIncomeReais) * 100
      : 0;

  const reserveReais = assets
    .filter((a) => a.category === "cash")
    .reduce((sum, a) => sum + a.currentValue.toNumber(), 0);

  const prescription = PrescriptionEngine.prescribe({
    now,
    debts,
    monthlyIncomeReais,
    monthlyEssentialReais: monthlyEssential,
    freeBalanceReais,
    committedPct,
    reserveReais,
    config: PRESCRIPTION_CONFIG,
  });

  return ok(prescription);
}

// Not exported from financial-health.service; local copy.
// Weekly factor matches domain service: 52/12.
const WEEKS_PER_MONTH = 52 / 12;

function monthlyIncomeOf(i: IncomeEntity, now: Date): number {
  const amount = i.amount.toNumber();
  switch (i.frequency) {
    case "monthly":
      return amount;
    case "weekly":
      return amount * WEEKS_PER_MONTH;
    case "one_off":
      return i.startDate.getTime() <= now.getTime() &&
        i.startDate.getUTCFullYear() === now.getUTCFullYear() &&
        i.startDate.getUTCMonth() === now.getUTCMonth()
        ? amount
        : 0;
  }
}
