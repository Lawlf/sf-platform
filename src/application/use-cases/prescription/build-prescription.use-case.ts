import {
  BASE_CURRENCY,
  convertAssetToBase,
  convertDebtToBase,
  convertIncomeToBase,
  type ConvertEntityDeps,
} from "@/application/use-cases/fx/convert-entity-to-base";
import type { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtAmountAdjustmentRepositoryPort } from "@/domain/ports/repositories/debt-amount-adjustment.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { IncomeSettlementRepositoryPort } from "@/domain/ports/repositories/income-settlement.repository";
import type { RecurringSettlementRepositoryPort } from "@/domain/ports/repositories/recurring-settlement.repository";
import type { Prescription } from "@/domain/services/prescription/prescription.types";
import type { TimelineSettlement } from "@/domain/services/timeline.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { isErr, ok, type Result } from "@/shared/errors/result";

import { prescribeFromEntities } from "./prescribe-from-entities";


export interface BuildPrescriptionDeps extends ConvertEntityDeps {
  debts: Pick<DebtRepositoryPort, "listForProfile">;
  incomes: Pick<IncomeRepositoryPort, "listForProfile">;
  assets: Pick<AssetRepositoryPort, "findActiveByProfile">;
  incomeSettlements: Pick<IncomeSettlementRepositoryPort, "listForProfile">;
  debtPayments: Pick<DebtPaymentRepositoryPort, "listForProfileInRange">;
  debtAmountAdjustments: Pick<DebtAmountAdjustmentRepositoryPort, "listForProfile">;
  recurringSettlements: Pick<RecurringSettlementRepositoryPort, "listForProfile">;
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
  const month = MonthYear.fromDate(now);

  const [rawDebts, rawIncomes, rawAssets, incomeSettlements, paymentsThisMonth, adjustments, recurringSettlementsRaw] =
    await Promise.all([
      deps.debts.listForProfile(input.profileId, { status: "active" }),
      deps.incomes.listForProfile(input.profileId, { onlyActive: true }),
      deps.assets.findActiveByProfile(input.profileId),
      deps.incomeSettlements.listForProfile(input.profileId),
      deps.debtPayments.listForProfileInRange(input.profileId, {
        from: month.firstDay(),
        to: month.lastDay(),
      }),
      deps.debtAmountAdjustments.listForProfile(input.profileId),
      deps.recurringSettlements.listForProfile(input.profileId),
    ]);

  const settlements: TimelineSettlement[] = recurringSettlementsRaw.map((s) => ({
    debtId: s.debtId,
    monthIso: MonthYear.fromDate(s.month).toIso(),
    status: s.status,
  }));

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

  const prescription = prescribeFromEntities({
    debts,
    incomes,
    assets,
    now,
    incomeSettlements,
    paymentsThisMonth,
    adjustments,
    settlements,
  });

  return ok(prescription);
}
