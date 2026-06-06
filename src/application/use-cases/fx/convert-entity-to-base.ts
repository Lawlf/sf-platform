import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { DebtAmountAdjustmentEntity } from "@/domain/entities/debt-amount-adjustment.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import { Money, type Currency } from "@/domain/value-objects/money.vo";
import { err, isErr, ok, type Result } from "@/shared/errors/result";

import { resolveFxRate, type ResolveFxRateDeps } from "./resolve-fx-rate.use-case";

export const BASE_CURRENCY: Currency = "BRL";

export type ConvertEntityDeps = ResolveFxRateDeps;

async function rateFor(
  deps: ConvertEntityDeps,
  userId: string,
  from: Currency,
  base: Currency,
  asOf?: Date,
): Promise<Result<number, FxRateUnavailableError>> {
  if (from === base) return ok(1);
  const resolved = await resolveFxRate(deps, {
    userId,
    fromCurrency: from,
    toCurrency: base,
    ...(asOf ? { asOf } : {}),
  });
  if (isErr(resolved)) return resolved;
  return ok(resolved.value.rate);
}

export async function convertAssetToBase(
  deps: ConvertEntityDeps,
  userId: string,
  asset: AssetEntity,
  base: Currency,
  asOf?: Date,
): Promise<Result<AssetEntity, FxRateUnavailableError>> {
  const rate = await rateFor(deps, userId, asset.currentValue.currency, base, asOf);
  if (isErr(rate)) return rate;
  if (rate.value === 1 && asset.currentValue.currency === base) return ok(asset);
  return ok({ ...asset, currentValue: asset.currentValue.convert(rate.value, base) });
}

export async function convertIncomeToBase(
  deps: ConvertEntityDeps,
  userId: string,
  income: IncomeEntity,
  base: Currency,
  asOf?: Date,
): Promise<Result<IncomeEntity, FxRateUnavailableError>> {
  const rate = await rateFor(deps, userId, income.amount.currency, base, asOf);
  if (isErr(rate)) return rate;
  if (rate.value === 1 && income.amount.currency === base) return ok(income);
  return ok({ ...income, amount: income.amount.convert(rate.value, base) });
}

export async function convertDebtToBase(
  deps: ConvertEntityDeps,
  userId: string,
  debt: DebtEntity,
  base: Currency,
  asOf?: Date,
): Promise<Result<DebtEntity, FxRateUnavailableError>> {
  const rate = await rateFor(deps, userId, debt.currentBalance.currency, base, asOf);
  if (isErr(rate)) return rate;
  if (rate.value === 1 && debt.currentBalance.currency === base) return ok(debt);
  return ok(applyRateToDebt(debt, rate.value, base));
}

function applyRateToDebt(debt: DebtEntity, rate: number, base: Currency): DebtEntity {
  const c = (m: Money) => m.convert(rate, base);
  switch (debt.kind) {
    case "financing":
      return {
        ...debt,
        originalPrincipal: c(debt.originalPrincipal),
        currentBalance: c(debt.currentBalance),
        monthlyInsurance: debt.monthlyInsurance ? c(debt.monthlyInsurance) : debt.monthlyInsurance,
        monthlyAdminFee: debt.monthlyAdminFee ? c(debt.monthlyAdminFee) : debt.monthlyAdminFee,
      };
    case "personal_loan":
      return {
        ...debt,
        originalPrincipal: c(debt.originalPrincipal),
        currentBalance: c(debt.currentBalance),
        monthlyInstallment: c(debt.monthlyInstallment),
      };
    case "credit_card":
      return {
        ...debt,
        originalPrincipal: c(debt.originalPrincipal),
        currentBalance: c(debt.currentBalance),
        creditLimit: debt.creditLimit ? c(debt.creditLimit) : debt.creditLimit,
        currentStatement: c(debt.currentStatement),
        revolvingBalance: debt.revolvingBalance ? c(debt.revolvingBalance) : debt.revolvingBalance,
        installmentPurchases: debt.installmentPurchases.map((p) => ({
          ...p,
          total: c(p.total),
          monthlyValue: c(p.monthlyValue),
        })),
      };
    case "overdraft":
      return {
        ...debt,
        originalPrincipal: c(debt.originalPrincipal),
        currentBalance: c(debt.currentBalance),
      };
    case "recurring":
      return {
        ...debt,
        originalPrincipal: c(debt.originalPrincipal),
        currentBalance: c(debt.currentBalance),
        recurringAmountCents: Money.fromCents(debt.recurringAmountCents, debt.currentBalance.currency)
          .convert(rate, base)
          .toCents(),
      };
  }
}

export async function convertPaymentToBase(
  deps: ConvertEntityDeps,
  userId: string,
  payment: DebtPaymentEntity,
  base: Currency,
  asOf?: Date,
): Promise<Result<DebtPaymentEntity, FxRateUnavailableError>> {
  const rate = await rateFor(deps, userId, payment.amount.currency, base, asOf);
  if (isErr(rate)) return rate;
  if (rate.value === 1) return ok(payment);
  return ok({
    ...payment,
    amount: payment.amount.convert(rate.value, base),
    principalPortion: payment.principalPortion.convert(rate.value, base),
    interestPortion: payment.interestPortion.convert(rate.value, base),
  });
}

export async function convertAdjustmentToBase(
  deps: ConvertEntityDeps,
  userId: string,
  adjustment: DebtAmountAdjustmentEntity,
  base: Currency,
  asOf?: Date,
): Promise<Result<DebtAmountAdjustmentEntity, FxRateUnavailableError>> {
  const rate = await rateFor(deps, userId, adjustment.amount.currency, base, asOf);
  if (isErr(rate)) return rate;
  if (rate.value === 1) return ok(adjustment);
  return ok({ ...adjustment, amount: adjustment.amount.convert(rate.value, base) });
}

export async function convertAllocationToBase(
  deps: ConvertEntityDeps,
  userId: string,
  allocation: AssetDebtAllocation,
  base: Currency,
  asOf?: Date,
): Promise<Result<AssetDebtAllocation, FxRateUnavailableError>> {
  const rate = await rateFor(deps, userId, allocation.allocationOriginal.currency, base, asOf);
  if (isErr(rate)) return rate;
  if (rate.value === 1) return ok(allocation);
  return ok({ ...allocation, allocationOriginal: allocation.allocationOriginal.convert(rate.value, base) });
}
