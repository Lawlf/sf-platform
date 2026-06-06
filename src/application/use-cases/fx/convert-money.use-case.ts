import { Money } from "@/domain/value-objects/money.vo";
import type { Currency } from "@/domain/value-objects/money.vo";
import { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import { isErr, ok, type Result } from "@/shared/errors/result";

import {
  resolveFxRate,
  type ResolveFxRateDeps,
} from "./resolve-fx-rate.use-case";

export type ConvertMoneyDeps = ResolveFxRateDeps;

export interface ConvertMoneyInput {
  userId: string;
  amount: Money;
  toCurrency: Currency;
  asOf?: Date;
}

export interface ConvertedMoney {
  money: Money;
  rate: number;
  source: "identity" | "override" | "auto";
  asOf: Date;
  stale: boolean;
}

export async function convertMoney(
  deps: ConvertMoneyDeps,
  input: ConvertMoneyInput,
): Promise<Result<ConvertedMoney, FxRateUnavailableError>> {
  const resolved = await resolveFxRate(deps, {
    userId: input.userId,
    fromCurrency: input.amount.currency,
    toCurrency: input.toCurrency,
    ...(input.asOf ? { asOf: input.asOf } : {}),
  });
  if (isErr(resolved)) return resolved;

  const money = input.amount.convert(resolved.value.rate, input.toCurrency);
  return ok({
    money,
    rate: resolved.value.rate,
    source: resolved.value.source,
    asOf: resolved.value.asOf,
    stale: resolved.value.stale,
  });
}
