import { InvalidInterestRateError } from "@/domain/errors/financial-errors";
import { err, ok, type Result } from "@/shared/errors";

export type RatePeriod = "monthly" | "annual";

const MONTHS_PER_YEAR = 12;

export class InterestRate {
  private constructor(
    private readonly value: number,
    private readonly period: RatePeriod,
  ) {}

  static fromMonthly(value: number): Result<InterestRate, InvalidInterestRateError> {
    return InterestRate.build(value, "monthly");
  }

  static fromAnnual(value: number): Result<InterestRate, InvalidInterestRateError> {
    return InterestRate.build(value, "annual");
  }

  private static build(
    value: number,
    period: RatePeriod,
  ): Result<InterestRate, InvalidInterestRateError> {
    if (!Number.isFinite(value)) {
      return err(new InvalidInterestRateError("Taxa deve ser um numero finito."));
    }
    if (value <= -1) {
      return err(new InvalidInterestRateError("Taxa nao pode ser menor ou igual a -100%."));
    }
    return ok(new InterestRate(value, period));
  }

  toDecimal(): number {
    return this.value;
  }

  toPercent(): number {
    return this.value * 100;
  }

  toMonthly(): InterestRate {
    if (this.period === "monthly") return this;
    return new InterestRate(Math.pow(1 + this.value, 1 / MONTHS_PER_YEAR) - 1, "monthly");
  }

  toAnnual(): InterestRate {
    if (this.period === "annual") return this;
    return new InterestRate(Math.pow(1 + this.value, MONTHS_PER_YEAR) - 1, "annual");
  }

  format(): string {
    const pct = this.toPercent();
    const formatted = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(pct);
    const suffix = this.period === "monthly" ? "% a.m." : "% a.a.";
    return `${formatted}${suffix}`;
  }

  equals(other: InterestRate): boolean {
    return Math.abs(this.toMonthly().toDecimal() - other.toMonthly().toDecimal()) < 1e-9;
  }

  compare(other: InterestRate): -1 | 0 | 1 {
    const a = this.toMonthly().toDecimal();
    const b = other.toMonthly().toDecimal();
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
}
