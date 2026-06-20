import { PRESCRIPTION_CONFIG } from "@/domain/config/prescription-config";
import type { DebtAmountAdjustmentEntity } from "@/domain/entities/debt-amount-adjustment.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import { monthlyDebtService } from "@/domain/services/financial-health.service";
import { monthlyIncomeCents } from "@/domain/services/income-monthly";
import { PrescriptionEngine } from "@/domain/services/prescription/prescription-engine.service";
import type { Prescription } from "@/domain/services/prescription/prescription.types";
import { monthlyDebtOutflow, type TimelineSettlement } from "@/domain/services/timeline.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { isOk } from "@/shared/errors/result";

export interface PrescribeFromEntitiesInput {
  debts: DebtEntity[];
  incomes: IncomeEntity[];
  assets: AssetEntity[];
  now: Date;
  incomeSettlements?: IncomeSettlementEntity[];
  paymentsThisMonth?: DebtPaymentEntity[];
  adjustments?: DebtAmountAdjustmentEntity[];
  settlements?: TimelineSettlement[];
}

export function prescribeFromEntities(input: PrescribeFromEntitiesInput): Prescription {
  const { debts, incomes, assets, now } = input;

  const incomeSettlements = input.incomeSettlements ?? [];

  const monthlyIncomeReais = incomes.reduce(
    (sum, i) => sum + monthlyIncomeOf(i, now, incomeSettlements),
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

  const month = MonthYear.fromDate(now);
  const outflowItems = monthlyDebtOutflow({
    debts,
    paymentsThisMonth: input.paymentsThisMonth ?? [],
    month,
    currentMonth: month,
    adjustments: input.adjustments ?? [],
    settlements: input.settlements ?? [],
  });
  const monthlyOutflowReais = outflowItems.reduce((sum, it) => sum + it.amount.toNumber(), 0);
  const freeBalanceReais = monthlyIncomeReais - monthlyOutflowReais;

  const committedPct =
    monthlyIncomeReais > 0
      ? (monthlyDebtTotal / monthlyIncomeReais) * 100
      : 0;

  const reserveReais = assets
    .filter((a) => a.category === "cash")
    .reduce((sum, a) => sum + a.currentValue.toNumber(), 0);

  const hasEstimatedIncome = incomes.some((i) => i.isEstimated);

  return PrescriptionEngine.prescribe({
    now,
    debts,
    monthlyIncomeReais,
    monthlyEssentialReais: monthlyEssential,
    freeBalanceReais,
    committedPct,
    reserveReais,
    hasEstimatedIncome,
    config: PRESCRIPTION_CONFIG,
  });
}

function monthlyIncomeOf(
  i: IncomeEntity,
  now: Date,
  incomeSettlements: IncomeSettlementEntity[],
): number {
  const target = { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  return Number(monthlyIncomeCents(i, target, incomeSettlements)) / 100;
}
