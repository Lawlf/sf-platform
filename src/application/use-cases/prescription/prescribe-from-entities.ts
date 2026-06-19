import { PRESCRIPTION_CONFIG } from "@/domain/config/prescription-config";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { monthlyDebtService } from "@/domain/services/financial-health.service";
import { PrescriptionEngine } from "@/domain/services/prescription/prescription-engine.service";
import type { Prescription } from "@/domain/services/prescription/prescription.types";
import { isOk } from "@/shared/errors/result";

const WEEKS_PER_MONTH = 52 / 12;

export interface PrescribeFromEntitiesInput {
  debts: DebtEntity[];
  incomes: IncomeEntity[];
  assets: AssetEntity[];
  now: Date;
}

export function prescribeFromEntities(input: PrescribeFromEntitiesInput): Prescription {
  const { debts, incomes, assets, now } = input;

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

  return PrescriptionEngine.prescribe({
    now,
    debts,
    monthlyIncomeReais,
    monthlyEssentialReais: monthlyEssential,
    freeBalanceReais,
    committedPct,
    reserveReais,
    config: PRESCRIPTION_CONFIG,
  });
}

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
