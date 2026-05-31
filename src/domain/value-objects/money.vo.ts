import { InvalidMoneyAmountError } from "@/domain/errors/financial-errors";
import { err, ok, type Result } from "@/shared/errors/result";

export type Currency = "BRL";

const PT_BR_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export class Money {
  private constructor(
    private readonly cents: bigint,
    readonly currency: Currency,
  ) {}

  static from(
    input: number | bigint | string,
    currency: Currency = "BRL",
  ): Result<Money, InvalidMoneyAmountError> {
    if (typeof input === "bigint") {
      return ok(new Money(input, currency));
    }
    if (typeof input === "number") {
      if (!Number.isFinite(input)) {
        return err(new InvalidMoneyAmountError("Valor monetário inválido."));
      }
      return ok(new Money(numberToCents(input), currency));
    }
    if (typeof input === "string") {
      const parsed = parseStringAmount(input);
      if (parsed === null) {
        return err(new InvalidMoneyAmountError(`Não foi possível ler valor monetário: ${input}`));
      }
      return ok(new Money(parsed, currency));
    }
    return err(new InvalidMoneyAmountError("Tipo de valor monetário não suportado."));
  }

  static fromCents(cents: bigint, currency: Currency = "BRL"): Money {
    return new Money(cents, currency);
  }

  static zero(currency: Currency = "BRL"): Money {
    return new Money(0n, currency);
  }

  toCents(): bigint {
    return this.cents;
  }

  toNumber(): number {
    return Number(this.cents) / 100;
  }

  format(): string {
    return PT_BR_FORMATTER.format(this.toNumber());
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents - other.cents, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isFinite(factor)) {
      throw new Error("Money.multiply factor must be finite");
    }
    const product = Number(this.cents) * factor;
    return new Money(BigInt(bankersRound(product)), this.currency);
  }

  divide(divisor: number): Money {
    if (!Number.isFinite(divisor) || divisor === 0) {
      throw new Error("Money.divide divisor must be finite and non-zero");
    }
    return this.multiply(1 / divisor);
  }

  negate(): Money {
    return new Money(-this.cents, this.currency);
  }

  abs(): Money {
    return new Money(this.cents < 0n ? -this.cents : this.cents, this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.cents === other.cents;
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.cents < other.cents) return -1;
    if (this.cents > other.cents) return 1;
    return 0;
  }

  isZero(): boolean {
    return this.cents === 0n;
  }

  isNegative(): boolean {
    return this.cents < 0n;
  }

  isPositive(): boolean {
    return this.cents > 0n;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot operate across currencies: ${this.currency} vs ${other.currency}`);
    }
  }
}

function numberToCents(amount: number): bigint {
  return BigInt(bankersRound(amount * 100));
}

/**
 * Banker's rounding (round half to even). Resolves the floating-point ".5"
 * ambiguity in a statistically unbiased way.
 */
function bankersRound(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("bankersRound: non-finite input");
  }
  const floor = Math.floor(value);
  const diff = value - floor;
  // Use a small epsilon to absorb floating-point representation error
  // (e.g., 0.1 + 0.2 = 0.30000000000000004) so we don't treat values that
  // are mathematically "exactly half" but stored as slightly-above-half
  // as different from the half boundary.
  const EPS = 1e-9;
  if (Math.abs(diff - 0.5) < EPS) {
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.round(value);
}

/**
 * Parses BRL-style strings.
 *
 * Accepted forms:
 *   "1234,56", "1234.56"
 *   "1.234,56" (BR thousands)
 *   "1,234.56" (US thousands)
 *   "R$ 1.234,56"
 *
 * Returns cents as bigint, or null if unparseable.
 */
function parseStringAmount(raw: string): bigint | null {
  let s = raw.trim();
  if (s.length === 0) return null;
  // remove currency symbol and whitespace
  s = s.replace(/r\$/gi, "").trim();
  // Remove letters? At this point only digits, separators, sign should remain.
  // Detect both . and , present, decide which is decimal by position (last seen).
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized: string;
  if (hasComma && hasDot) {
    // last comma OR last dot is the decimal separator (whichever appears later)
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      // BR format: dots are thousands, comma is decimal
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: commas are thousands, dot is decimal
      normalized = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // only comma: treat as decimal separator
    normalized = s.replace(",", ".");
  } else {
    normalized = s;
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num)) return null;
  return numberToCents(num);
}
