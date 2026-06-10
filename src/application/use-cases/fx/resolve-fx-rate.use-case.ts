import { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import type { Currency } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

const DEFAULT_STALE_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ResolveFxRateDeps {
  rates: ExchangeRateRepositoryPort;
  overrides: UserFxOverrideRepositoryPort;
  clock: Clock;
}

export interface ResolveFxRateInput {
  userId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  asOf?: Date;
  staleAfterDays?: number;
}

export interface ResolvedFxRate {
  rate: number;
  rateDecimal: string;
  source: "identity" | "override" | "auto";
  asOf: Date;
  stale: boolean;
}

export async function resolveFxRate(
  deps: ResolveFxRateDeps,
  input: ResolveFxRateInput,
): Promise<Result<ResolvedFxRate, FxRateUnavailableError>> {
  const now = deps.clock.now();
  const asOf = input.asOf ?? now;

  if (input.fromCurrency === input.toCurrency) {
    return ok({ rate: 1, rateDecimal: "1", source: "identity", asOf: now, stale: false });
  }

  const override = await deps.overrides.find(
    input.userId,
    input.fromCurrency,
    input.toCurrency,
  );
  if (override) {
    return ok({
      rate: Number(override.rateDecimal),
      rateDecimal: override.rateDecimal,
      source: "override",
      asOf: override.updatedAt,
      stale: false,
    });
  }

  const latest = await deps.rates.findLatest(
    input.fromCurrency,
    input.toCurrency,
    asOf,
  );
  if (!latest) {
    return err(
      new FxRateUnavailableError(
        `Sem cotação para ${input.fromCurrency}->${input.toCurrency}.`,
      ),
    );
  }

  const staleAfter = (input.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS) * DAY_MS;
  const stale = now.getTime() - latest.asOf.getTime() > staleAfter;

  return ok({
    rate: Number(latest.rateDecimal),
    rateDecimal: latest.rateDecimal,
    source: "auto",
    asOf: latest.asOf,
    stale,
  });
}
