# Domain Core Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the financial domain core (pure TypeScript, zero deps on Next/React/Drizzle/Zod). Value objects (`Money`, `InterestRate`, `Period`, `AmortizationSchedule`) plus pure domain services (`PriceAmortization`, `SacAmortization`, `CetCalculator`, `DebtPayoffProjector`, `PayoffStrategy`, `RevolvingCostProjector`, `FinancialHealthService`, `IncomeCommittedService`). All TDD with deterministic fixtures.

**Architecture:** Everything lives under `src/domain/value-objects/` and `src/domain/services/`. No I/O, no async (calculations are pure functions), no framework imports. Domain entities consumed by services come from `src/domain/entities/` (Debt entity needs to be added since Plan 2 only added User/Session/MagicLinkToken/OauthAccount). Result type from `@/shared/errors` for fallible operations (e.g., invalid rate).

**Tech Stack:** TypeScript 5.6 strict. Vitest. BigInt-backed Money. Pure functions. Property-based testing for some invariants (fast-check, optional).

---

## File Structure

```
src/
  domain/
    entities/
      debt.entity.ts                                   # NEW. Discriminated union by kind
      income.entity.ts                                 # NEW. Recurring or one-off
      debt-payment.entity.ts                           # NEW. Records of payments
      financial-snapshot.entity.ts                     # NEW. Monthly snapshots
    value-objects/
      money.vo.ts                                      # bigint-backed BRL Money
      money.vo.test.ts
      interest-rate.vo.ts                              # monthly <-> annual conversion via compound
      interest-rate.vo.test.ts
      period.vo.ts                                     # start/end, monthsBetween, contains
      period.vo.test.ts
      amortization-schedule.vo.ts                      # array of installments, immutable, invariants
      amortization-schedule.vo.test.ts
    services/
      amortization/
        price-amortization.service.ts                  # Sistema Frances (parcela fixa)
        price-amortization.service.test.ts
        sac-amortization.service.ts                    # Sistema de Amortizacao Constante
        sac-amortization.service.test.ts
      cet-calculator.service.ts                        # Newton-Raphson over cash flow
      cet-calculator.service.test.ts
      debt-payoff-projector.service.ts                 # forward simulate a single debt
      debt-payoff-projector.service.test.ts
      payoff-strategy.service.ts                       # snowball vs avalanche compare
      payoff-strategy.service.test.ts
      revolving-cost-projector.service.ts              # rotativo / cheque especial extrapolation
      revolving-cost-projector.service.test.ts
      financial-health.service.ts                      # snapshot generator
      financial-health.service.test.ts
      income-committed.service.ts                      # % renda comprometida
      income-committed.service.test.ts
      index.ts                                         # barrel exporting all services

  shared/
    errors/
      domain-errors.ts                                 # add: InvalidMoneyAmountError, InvalidInterestRateError, InvalidPeriodError, InvalidAmortizationParamsError

test/
  fixtures/
    debts.ts                                           # canonical fixtures (financiamento Price 200k/360/10%aa, etc.)
    incomes.ts
```

---

## Conventions

- **Working directory:** `/Users/fernandes/Projects/sabor-financeiro/sf-platform`.
- **No git commits without explicit user instruction.**
- **No em-dashes (U+2014), no emoji.** Portuguese accents required where natural.
- **TDD strict.** RED -> GREEN -> commit-message in report.
- **No `Math.round` for currency.** Always use `Money.round()` (banker's rounding or ROUND_HALF_EVEN) on BigInt cents.
- **No `Date.now()` direct.** Services that need time accept a `Clock` (already defined in `src/domain/ports/clock.port.ts`).
- **No floating point on currency.** All amounts as `bigint` cents inside `Money`.
- **Rates use `number` (not bigint) but in decimal form** (`0.1` = 10%). Conversion helpers wrap monthly/annual.

---

## Math reference (cheat sheet for implementers)

These formulas drive the services. Test fixtures verify against textbook values.

**Price (Sistema Frances) installment:**

```
i = monthly rate (decimal)
n = term in months
P = principal

parcela = P * i / (1 - (1 + i)^-n)
```

For `P = 200_000`, `i = 0.10/12 (approx 0.00833333)`, `n = 360`:
- parcela ≈ R$ 1755.14
- Total pago ≈ R$ 631_851 (= parcela × 360)
- Total juros ≈ R$ 431_851

**SAC (Sistema de Amortizacao Constante):**

```
amort = P / n   (constant)
juros_k = saldo_devedor_k_minus_1 * i
parcela_k = amort + juros_k
saldo_k = saldo_k_minus_1 - amort
```

First installment is largest, last is smallest. Sum of amortizations = principal.

**Compound monthly <-> annual conversion:**

```
(1 + monthly)^12 = 1 + annual
monthly = (1 + annual)^(1/12) - 1
```

**CET (Custo Efetivo Total):**

CET is the IRR (internal rate of return) of the cash flow `[+P, -parcela_1, -parcela_2, ..., -parcela_n]`. Solve for the rate `r` that makes NPV = 0:

```
sum_{k=0..n} CF_k / (1 + r)^k = 0
```

Numerical method: Newton-Raphson. Start guess = `annual_rate / 12`. Stop when |delta| < 1e-9 or 100 iterations.

**Snowball (bola de neve) order:** smallest balance first.

**Avalanche (efeito cascata) order:** highest interest rate first.

Both strategies use the same monthly budget. Each month: pay minimums on all debts, then apply leftover to the priority debt. When priority debt is paid, roll its payment into the next priority.

---

## Task 1: Money value object

**Files:**
- Create: `src/domain/value-objects/money.vo.ts`, `money.vo.test.ts`
- Modify: `src/shared/errors/domain-errors.ts` (add `InvalidMoneyAmountError`)

### Design

- Internal storage: `bigint` cents.
- Currency: literal `"BRL"` for v0.1. Future multi-currency = generic param.
- Operations: `add`, `subtract`, `multiply(scalar | rate)`, `divide(scalar)`, `negate`, `abs`, `compare`, `equals`, `format` (pt-BR), `toCents`, `isZero`, `isNegative`, `isPositive`.
- Static: `Money.from(amount: number | bigint | string, currency?: 'BRL')` -> `Result<Money, InvalidMoneyAmountError>`.
  - `number` input: multiply by 100, round to nearest cent (banker's rounding).
  - `string` input: support "1234.56", "1234,56", "R$ 1.234,56".
  - `bigint` input: treat as cents directly.
- Rounding: `Money.fromBigDecimal(value: BigDecimal)` for internal use by services. For external `number` input, banker's rounding to nearest cent.

### Constructor private

`Money.from()` returns Result. Direct `new Money(...)` blocked.

### Sample API

```ts
const a = Money.from(1234.56);            // ok
const b = Money.from("R$ 1.234,56");      // ok, equivalent
const sum = a.value.add(b.value);         // BigInt-safe
console.log(sum.format());                // "R$ 2.469,12"
```

### Tests (10+)

1. `from(1234.56)` ok, stores 123456 cents.
2. `from(0)` ok.
3. `from(-100)` ok, negative.
4. `from(NaN)` returns Err.
5. `from(Infinity)` returns Err.
6. `from("1234,56")` parses BR format.
7. `from("R$ 1.234,56")` parses BR format with symbol.
8. `add` cents accurate (no floating point drift): `0.1 + 0.2` equals `0.30` exactly.
9. `multiply` by scalar.
10. `format()` returns "R$ 1.234,56".
11. `equals` and `compare`.
12. Cross-currency operations would throw (but v0.1 has only BRL; test for forward compat).
13. Banker's rounding at 0.5 boundary: `0.005` rounds to 0 cent, `0.015` rounds to 2 cents.

### TDD

- RED: write all 13 tests against missing `./money.vo` -> module not found.
- GREEN: implement, see all pass.
- REFACTOR: extract `parseAmount(input)` helper for the three input forms.

### Implementation hints

```ts
// money.vo.ts skeleton
import { DomainError } from "@/shared/errors";

export class InvalidMoneyAmountError extends DomainError {
  readonly code = "INVALID_MONEY_AMOUNT" as const;
}

export type Currency = "BRL";

export class Money {
  private constructor(
    private readonly cents: bigint,
    private readonly currency: Currency,
  ) {}

  static from(input: number | bigint | string, currency: Currency = "BRL"): Result<Money, InvalidMoneyAmountError> {
    // ... parse + round to cents
  }

  static fromCents(cents: bigint, currency: Currency = "BRL"): Money {
    return new Money(cents, currency);
  }

  static zero(currency: Currency = "BRL"): Money {
    return new Money(0n, currency);
  }

  add(other: Money): Money { ... }
  subtract(other: Money): Money { ... }
  multiply(factor: number): Money { ... }  // factor as number (e.g., 1.05 for 5% growth)
  divide(divisor: number): Money { ... }
  negate(): Money { ... }
  abs(): Money { ... }

  toCents(): bigint { return this.cents; }
  toNumber(): number { return Number(this.cents) / 100; } // use only for display, not for math
  format(): string { /* Intl.NumberFormat pt-BR currency BRL */ }

  equals(other: Money): boolean { ... }
  compare(other: Money): -1 | 0 | 1 { ... }
  isZero(): boolean { return this.cents === 0n; }
  isNegative(): boolean { return this.cents < 0n; }
  isPositive(): boolean { return this.cents > 0n; }
}
```

`multiply(factor: number)` does: `Number(cents) * factor` then `Math.round` to nearest cent. For long-running compound calculations, services should accumulate in BigDecimal (next task) and only convert back at the end.

Actually simpler: keep `multiply(factor: number)` for one-off scalings (e.g., interest portion of a payment). For multi-step compound math, use plain `number` throughout the service and convert to Money at boundaries.

### Suggested commit message

```
feat(domain/money): add bigint-backed Money value object with BRL parsing and formatting
```

---

## Task 2: InterestRate value object

**Files:**
- Create: `src/domain/value-objects/interest-rate.vo.ts`, `interest-rate.vo.test.ts`
- Modify: `src/shared/errors/domain-errors.ts` (add `InvalidInterestRateError`)

### Design

- Internal: `number` (decimal, 0.10 = 10%).
- Period: `monthly` or `annual` literal.
- `InterestRate.fromAnnual(0.10)`, `InterestRate.fromMonthly(0.00833)`.
- Conversion: `toAnnual()`, `toMonthly()` via compound formula.
- `Result<InterestRate, InvalidInterestRateError>` on invalid input (negative below -0.99, non-finite).
- `format()` returns "0,83% a.m." or "10,00% a.a."

### Tests (8+)

1. `fromAnnual(0.10).toMonthly()` ≈ 0.007974 (approx). Verify with `toBeCloseTo(0.007974, 6)`.
2. `fromMonthly(0.01).toAnnual()` ≈ 0.126825 (approx).
3. Round-trip: `fromAnnual(0.10).toMonthly().toAnnual()` ≈ 0.10.
4. `fromAnnual(0)` ok (zero rate).
5. `fromAnnual(-0.5)` returns Err if you want to forbid; or ok if rates can be negative (some treasury rates are). Decision: allow `>= -0.99`, reject `< -0.99` and non-finite.
6. `fromMonthly(-1)` returns Err (would be -100%).
7. `format()` pt-BR with locale.
8. `equals` and `compare`.

### TDD

Same red-green-refactor.

### Suggested commit

```
feat(domain/interest-rate): add InterestRate VO with monthly/annual compound conversion
```

---

## Task 3: Period value object

**Files:**
- Create: `src/domain/value-objects/period.vo.ts`, `period.vo.test.ts`
- Modify: `src/shared/errors/domain-errors.ts` (add `InvalidPeriodError`)

### Design

- Internal: `start: Date`, `end: Date | null` (open-ended).
- `Period.from(start, end?)` returns `Result<Period, InvalidPeriodError>` (errors when `end < start`).
- `Period.monthsBetween(other?: Date)` returns whole months (uses end if both exist, else `other`).
- `contains(date: Date)`: true if start <= date <= end (or no end).
- `daysBetween(other?: Date)` (helper for partial-month proration).

### Tests (6+)

1. `from(jan, mar)` ok. monthsBetween = 2.
2. `from(mar, jan)` returns Err (end before start).
3. Open-ended `from(jan).monthsBetween(jul)` = 6.
4. `contains(feb)` true; `contains(apr)` false (when end = mar).
5. Crossing year: `from(2023-11, 2024-02)` monthsBetween = 3.
6. Same start and end: monthsBetween = 0.

### Suggested commit

```
feat(domain/period): add Period VO with months/days helpers
```

---

## Task 4: AmortizationSchedule value object

**Files:**
- Create: `src/domain/value-objects/amortization-schedule.vo.ts`, `amortization-schedule.vo.test.ts`

### Design

```ts
export interface AmortizationInstallment {
  readonly month: number;            // 1-indexed
  readonly installment: Money;       // parcela total do mes
  readonly principal: Money;         // amortizacao
  readonly interest: Money;          // juros
  readonly remainingBalance: Money;  // saldo apos pagar esta parcela
}

export class AmortizationSchedule {
  private constructor(
    readonly installments: ReadonlyArray<AmortizationInstallment>,
    readonly originalPrincipal: Money,
  ) {}

  static from(input: { installments: AmortizationInstallment[]; originalPrincipal: Money }): Result<AmortizationSchedule, InvalidAmortizationParamsError> { ... }

  totalPaid(): Money { sum of installments }
  totalInterest(): Money { totalPaid - originalPrincipal }
  totalPrincipal(): Money { sum of principal portions, should equal originalPrincipal +/- 1 cent rounding }
  termMonths(): number { installments.length }
  installmentAt(month: number): AmortizationInstallment | null
}
```

### Invariants enforced by `from()`

1. installments non-empty.
2. Each month is 1, 2, 3, ... (no gaps, no duplicates).
3. Sum of principal portions reconciles with originalPrincipal within 1 cent tolerance (rounding leftover).
4. Final remainingBalance is zero (within 1 cent tolerance).
5. installment[k] = principal[k] + interest[k] (within 1 cent).

If any invariant fails, return Err.

### Tests (8+)

1. `from` with valid 12-month schedule. All invariants hold.
2. `from` with gap (months 1, 2, 4) returns Err.
3. `from` with negative principal portion returns Err.
4. `totalPaid` correct.
5. `totalInterest` = totalPaid - originalPrincipal.
6. `installmentAt(5)` returns the 5th row, `installmentAt(99)` returns null.
7. Final remainingBalance not zero -> Err.
8. installment[k] != principal[k] + interest[k] (off by R$1) -> Err.

### Suggested commit

```
feat(domain/amortization-schedule): add immutable schedule VO with invariants
```

---

## Task 5: PriceAmortizationService

**Files:**
- Create: `src/domain/services/amortization/price-amortization.service.ts`, `price-amortization.service.test.ts`

### Implementation

```ts
import type { Money } from "@/domain/value-objects/money.vo";
import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { AmortizationSchedule, type AmortizationInstallment } from "@/domain/value-objects/amortization-schedule.vo";
import { Money as M } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors";
import { InvalidAmortizationParamsError } from "@/shared/errors";

export interface PriceParams {
  principal: Money;            // > 0
  annualRate: InterestRate;    // annual decimal
  termMonths: number;          // >= 1
}

export class PriceAmortizationService {
  static generate(params: PriceParams): Result<AmortizationSchedule, InvalidAmortizationParamsError> {
    if (params.termMonths < 1) return err(new InvalidAmortizationParamsError("termMonths must be >= 1"));
    if (params.principal.isNegative() || params.principal.isZero()) return err(new InvalidAmortizationParamsError("principal must be positive"));

    const i = params.annualRate.toMonthly().toDecimal();   // monthly decimal
    const n = params.termMonths;
    const P = Number(params.principal.toCents()) / 100;     // for math (will round back to cents)

    let installmentValue: number;
    if (i === 0) {
      installmentValue = P / n;
    } else {
      installmentValue = (P * i) / (1 - Math.pow(1 + i, -n));
    }

    const installments: AmortizationInstallment[] = [];
    let balance = P;
    for (let month = 1; month <= n; month++) {
      const interest = balance * i;
      let principalPortion = installmentValue - interest;
      let installmentNow = installmentValue;
      // last month: clean up rounding
      if (month === n) {
        principalPortion = balance;
        installmentNow = principalPortion + interest;
        balance = 0;
      } else {
        balance = balance - principalPortion;
      }

      const installmentMoney = M.from(installmentNow);
      const principalMoney = M.from(principalPortion);
      const interestMoney = M.from(interest);
      const balanceMoney = M.from(balance);

      // assume each from() ok; if not, propagate
      if (!installmentMoney.ok || !principalMoney.ok || !interestMoney.ok || !balanceMoney.ok) {
        return err(new InvalidAmortizationParamsError("amount calculation produced invalid Money"));
      }

      installments.push({
        month,
        installment: installmentMoney.value,
        principal: principalMoney.value,
        interest: interestMoney.value,
        remainingBalance: balanceMoney.value,
      });
    }

    return AmortizationSchedule.from({ installments, originalPrincipal: params.principal });
  }
}
```

(`Result.ok` discriminator in this codebase is `_tag === "ok"`. The snippet above is illustrative; align with the actual Result API in `src/shared/errors/result.ts`.)

### Tests (8+)

Use known textbook fixtures.

1. `P=200_000, i=10% a.a., n=360` Price -> first installment ≈ R$ 1755.14 (within R$ 0.01).
2. Total paid for above ≈ R$ 631_851.51 (sum of parcelas, within R$ 1).
3. Total interest ≈ R$ 431_851.51.
4. Final remainingBalance = R$ 0.
5. `i = 0` (zero rate): installments equal P/n exactly. Total = P.
6. `n = 1`: single installment = principal + 1 month of interest.
7. `n = 12, i = 12% a.a., P = 12_000`: parcela ≈ R$ 1066.19. Validate.
8. termMonths < 1 returns Err.
9. principal <= 0 returns Err.

### Suggested commit

```
feat(domain/amortization): add PriceAmortizationService (Sistema Frances)
```

---

## Task 6: SacAmortizationService

**Files:**
- Create: `src/domain/services/amortization/sac-amortization.service.ts`, `sac-amortization.service.test.ts`

### Implementation

```ts
export class SacAmortizationService {
  static generate(params: PriceParams): Result<AmortizationSchedule, InvalidAmortizationParamsError> {
    // ... validate
    const i = params.annualRate.toMonthly().toDecimal();
    const n = params.termMonths;
    const P = Number(params.principal.toCents()) / 100;
    const amort = P / n;

    const installments: AmortizationInstallment[] = [];
    let balance = P;
    for (let month = 1; month <= n; month++) {
      const interest = balance * i;
      const installment = amort + interest;
      let principalNow = amort;
      let balanceAfter = balance - amort;
      if (month === n) {
        principalNow = balance;
        balanceAfter = 0;
      } else {
        balance = balanceAfter;
      }
      // ... build AmortizationInstallment, push
    }

    return AmortizationSchedule.from({ installments, originalPrincipal: params.principal });
  }
}
```

### Tests (6+)

1. `P=120_000, i=12% a.a., n=120` SAC -> month 1 installment > month 120. Both validate vs textbook.
2. Constant amortization: every month's `principal` portion equals `P/n` (except last for rounding).
3. Last month's installment is roughly P/n + tiny interest.
4. Total paid < Price equivalent (SAC pays less total interest than Price).
5. Sum of all principal portions ≈ P.
6. i = 0 -> all installments equal P/n.

### Suggested commit

```
feat(domain/amortization): add SacAmortizationService
```

---

## Task 7: CetCalculatorService

**Files:**
- Create: `src/domain/services/cet-calculator.service.ts`, `cet-calculator.service.test.ts`

### Implementation

```ts
export interface CetParams {
  principal: Money;
  installments: Money[];                // monthly outflows
  upfrontFees?: Money;                  // optional, reduces effective principal received
}

export class CetCalculatorService {
  static compute(params: CetParams): Result<InterestRate, InvalidAmortizationParamsError> {
    // Solve r in: principal - upfrontFees = sum_{k=1..n} installments[k-1] / (1 + r)^k
    // Newton-Raphson on f(r) = NPV(r). Start at 0.01 (1% monthly).
  }
}
```

Newton-Raphson loop (max 100 iterations, tolerance 1e-9):

```ts
let r = 0.01;
for (let iter = 0; iter < 100; iter++) {
  let npv = -netPrincipal;
  let dnpv = 0;
  for (let k = 0; k < installments.length; k++) {
    const t = k + 1;
    const denom = Math.pow(1 + r, t);
    npv += installments[k] / denom;
    dnpv += -t * installments[k] / Math.pow(1 + r, t + 1);
  }
  if (Math.abs(npv) < 1e-9) break;
  if (dnpv === 0) return err(new InvalidAmortizationParamsError("CET: derivative is zero"));
  r = r - npv / dnpv;
  if (r <= -1) r = -0.99;  // clamp
}
return InterestRate.fromMonthly(r);
```

Convert to annual for final result.

### Tests (5+)

1. Zero-fee Price loan should recover the input annual rate (CET ≈ informed rate).
2. Loan with 1000 of upfront fees on a 10000 principal -> CET > nominal rate.
3. Single payment of `principal * (1 + r)`, n=1 -> CET = r.
4. Returns Err on empty installments.
5. Convergence on a known textbook example: `P=10_000, parcela=R$ 1.000 por 12 meses` -> CET monthly ≈ 0.02923 (around 2.92% a.m. or 41.3% a.a.). Verify with `toBeCloseTo`.

### Suggested commit

```
feat(domain): add CetCalculatorService via Newton-Raphson
```

---

## Task 8: Add Debt + Income + DebtPayment entities

**Files:**
- Create: `src/domain/entities/debt.entity.ts`
- Create: `src/domain/entities/income.entity.ts`
- Create: `src/domain/entities/debt-payment.entity.ts`
- Create: `src/domain/entities/financial-snapshot.entity.ts`

These are POJO types (no methods, mirror the spec).

### `debt.entity.ts`

```ts
import type { Money } from "@/domain/value-objects/money.vo";
import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";

export type DebtKind = "financing" | "personal_loan" | "credit_card" | "overdraft";
export type DebtStatus = "active" | "paid_off" | "written_off";
export type AmortizationMethod = "PRICE" | "SAC";

interface BaseDebt {
  id: string;
  userId: string;
  label: string;
  status: DebtStatus;
  originalPrincipal: Money;
  currentBalance: Money;
  startDate: Date;
  expectedEndDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancingDebt extends BaseDebt {
  kind: "financing";
  amortizationMethod: AmortizationMethod;
  annualInterestRate: InterestRate;
  termMonths: number;
  monthlyInsurance: Money | null;
  monthlyAdminFee: Money | null;
}

export interface PersonalLoanDebt extends BaseDebt {
  kind: "personal_loan";
  annualInterestRate: InterestRate;     // OR informed CET
  termMonths: number;
  monthlyInstallment: Money;
}

export interface InstallmentPurchase {
  description: string;
  total: Money;
  installmentsTotal: number;
  installmentsRemaining: number;
  monthlyValue: Money;
}

export interface CreditCardDebt extends BaseDebt {
  kind: "credit_card";
  creditLimit: Money;
  statementDay: number;                  // 1..31
  dueDay: number;                        // 1..31
  currentStatement: Money;
  revolvingBalance: Money | null;
  revolvingMonthlyRate: InterestRate | null;
  installmentPurchases: InstallmentPurchase[];
}

export interface OverdraftDebt extends BaseDebt {
  kind: "overdraft";
  bankName: string;
  monthlyRate: InterestRate;
  lastChargeDate: Date | null;
}

export type DebtEntity = FinancingDebt | PersonalLoanDebt | CreditCardDebt | OverdraftDebt;
```

### `income.entity.ts`

```ts
import type { Money } from "@/domain/value-objects/money.vo";

export type IncomeFrequency = "monthly" | "weekly" | "one_off";

export interface IncomeEntity {
  id: string;
  userId: string;
  label: string;
  amount: Money;
  frequency: IncomeFrequency;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
}
```

### `debt-payment.entity.ts`

```ts
import type { Money } from "@/domain/value-objects/money.vo";

export interface DebtPaymentEntity {
  id: string;
  debtId: string;
  paidAt: Date;
  amount: Money;
  principalPortion: Money;
  interestPortion: Money;
  isExtra: boolean;
}
```

### `financial-snapshot.entity.ts`

```ts
import type { Money } from "@/domain/value-objects/money.vo";
import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";

export interface FinancialSnapshotEntity {
  id: string;
  userId: string;
  asOfDate: Date;
  totalIncome: Money;             // monthly equivalent
  totalDebtBalance: Money;
  netWorth: Money;                // totalIncome (monthly) - debt service (monthly), or other definition
  cetWeightedAverage: InterestRate;
  incomeCommittedPct: number;     // 0..1
}
```

### Tests

These are types, no behavior, so no test files. The next services will import them; verify by compile.

### Suggested commit

```
feat(domain/entities): add Debt, Income, DebtPayment, FinancialSnapshot entity types
```

---

## Task 9: DebtPayoffProjectorService

**Files:**
- Create: `src/domain/services/debt-payoff-projector.service.ts` + test

### Logic

Forward simulate a single debt month-by-month given a fixed monthly payment plus optional extra. Stop when balance hits zero.

```ts
export interface DebtPayoffProjectionInput {
  debt: DebtEntity;
  monthlyPayment: Money;          // ordinary scheduled payment (or minimum)
  extraPayment: Money;            // 0 if none
  startingFrom: Date;             // usually today
  maxMonths: number;              // safety cap (e.g., 600 = 50 years)
}

export interface DebtPayoffProjection {
  payoffMonth: number | null;       // 1..maxMonths, null if not paid within cap
  payoffDate: Date | null;
  totalInterest: Money;
  totalPaid: Money;
  monthlySchedule: AmortizationInstallment[];
}

export class DebtPayoffProjectorService {
  static project(input: DebtPayoffProjectionInput): Result<DebtPayoffProjection, InvalidAmortizationParamsError> { ... }
}
```

For credit_card debt with `revolvingBalance`, treat revolving as principal accruing `revolvingMonthlyRate`. For overdraft, similar. For financing/personal_loan, accrue at the kind-specific rate.

Each month:
1. interest = balance * monthlyRate
2. payment = monthlyPayment + extraPayment
3. if payment <= interest: balance grows (under-water). Mark "negative amortization" warning but continue.
4. principal portion = payment - interest
5. balance = balance - principal portion
6. if balance <= 0: payoff this month, push final installment with adjusted values, exit.

### Tests (5+)

1. Financing 200k, 360m, 10% a.a., monthly payment = parcela Price -> payoffMonth = 360.
2. Same debt with extra R$ 500/month -> payoffMonth < 360.
3. Overdraft 10k at 8% a.m., monthlyPayment R$ 100 -> negative amortization warning (interest > payment).
4. Pay exactly the interest -> balance never decreases, payoffMonth = null (caps at maxMonths).
5. Pay double the parcela -> payoff in roughly half the term.

### Suggested commit

```
feat(domain): add DebtPayoffProjectorService with extra-payment simulation
```

---

## Task 10: PayoffStrategyService (snowball + avalanche)

**Files:**
- Create: `src/domain/services/payoff-strategy.service.ts` + test

### Logic

```ts
export interface PayoffStrategyInput {
  debts: DebtEntity[];
  monthlyBudget: Money;            // total available for all debts combined
  startingFrom: Date;
  maxMonths: number;
}

export interface PayoffPlan {
  order: string[];                  // debt IDs in priority order
  monthsToFreedom: number;
  totalInterest: Money;
  totalPaid: Money;
}

export interface PayoffComparison {
  snowball: PayoffPlan;
  avalanche: PayoffPlan;
}

export class PayoffStrategyService {
  static compare(input: PayoffStrategyInput): Result<PayoffComparison, InvalidAmortizationParamsError> { ... }
}
```

Algorithm:

1. Compute minimum payment for each debt (depends on kind: financing/personal_loan use scheduled parcela; cards use minimum payment = 15% of statement or some rule; overdraft = interest only).
2. Check `sum(minimums) <= monthlyBudget`. If not, return Err with diagnostic.
3. Order: snowball = ascending currentBalance; avalanche = descending annualRate (highest first).
4. Each month: pay minimums on all, apply leftover to the priority. When priority paid, roll its payment + leftover to next.
5. Track months, total interest, total paid.

### Tests (5+)

1. Two debts, one R$ 1000 @ 5% a.m., one R$ 10000 @ 1% a.m. Budget R$ 800/mo. Snowball clears small first -> psychological win. Avalanche clears 5% first -> less total interest. Both diff visible.
2. Single debt: snowball = avalanche.
3. Budget < sum minimums returns Err.
4. Same balance + same rate = same order regardless of strategy.
5. Snowball total paid >= avalanche total paid (mathematical guarantee).

### Suggested commit

```
feat(domain): add PayoffStrategyService comparing snowball vs avalanche
```

---

## Task 11: RevolvingCostProjectorService

**Files:**
- Create: `src/domain/services/revolving-cost-projector.service.ts` + test

### Logic

```ts
export interface RevolvingCostInput {
  currentBalance: Money;
  monthlyRate: InterestRate;
  monthsAhead: number;
}

export interface RevolvingCostProjection {
  monthlyBalances: Money[];           // length = monthsAhead, balance after each month if no payment
  totalAfter: Money;                  // monthlyBalances[monthsAhead - 1]
  multiplier: number;                 // totalAfter / currentBalance
}

export class RevolvingCostProjectorService {
  static project(input: RevolvingCostInput): Result<RevolvingCostProjection, InvalidAmortizationParamsError> {
    // balance_k = balance_0 * (1 + r)^k
  }
}
```

### Tests (4+)

1. balance R$ 1000, rate 10% a.m., 12 months -> balance ≈ R$ 3138 (1000 * 1.1^12).
2. multiplier matches Math.pow.
3. 0 months -> array [], totalAfter = currentBalance.
4. Negative months returns Err.

### Suggested commit

```
feat(domain): add RevolvingCostProjectorService showing compound growth of revolving credit
```

---

## Task 12: FinancialHealthService + IncomeCommittedService

**Files:**
- Create: `src/domain/services/financial-health.service.ts` + test
- Create: `src/domain/services/income-committed.service.ts` + test

### IncomeCommitted

```ts
export class IncomeCommittedService {
  static compute(input: { totalMonthlyIncome: Money; totalMonthlyDebtService: Money }): number {
    // returns 0..N as a decimal. Above 1 means debt service exceeds income.
    if (input.totalMonthlyIncome.isZero()) return Number.POSITIVE_INFINITY;
    return Number(input.totalMonthlyDebtService.toCents()) / Number(input.totalMonthlyIncome.toCents());
  }
}
```

### FinancialHealth.snapshot

```ts
export interface FinancialSnapshotInput {
  userId: string;
  incomes: IncomeEntity[];
  debts: DebtEntity[];
  asOfDate: Date;
}

export class FinancialHealthService {
  static snapshot(input: FinancialSnapshotInput): Result<FinancialSnapshotEntity, InvalidAmortizationParamsError> {
    // compute totalIncome (monthly equivalent)
    // compute totalDebtBalance (sum of currentBalance across active debts)
    // compute cetWeightedAverage (per-debt rate weighted by balance)
    // compute incomeCommittedPct (sum of monthly debt service / monthly income)
    // compute netWorth (definition: monthly income - monthly debt service; or simply total income - total debt; pick one)
    //
    // Spec mention: "netWorth (Money)" -- ambiguous between "stock" (total assets - liabilities)
    // and "flow" (monthly income - monthly debt service).
    // v0.1 decision: netWorth = totalIncome (monthly) - totalDebtMonthlyService (monthly).
    // This is the "monthly free cash flow" view. Document the decision.
  }
}
```

### Helper: monthly equivalent of income

```ts
function monthlyEquivalent(income: IncomeEntity, asOf: Date): Money {
  if (!income.isActive) return Money.zero();
  switch (income.frequency) {
    case "monthly": return income.amount;
    case "weekly": return income.amount.multiply(52 / 12);
    case "one_off": {
      // pro-rate over the period if it falls in the current month, else 0
      // simplification: only count one_off in the snapshot if its date is in the current month of asOf
      // ...
    }
  }
}
```

### Helper: monthly debt service

For each debt:
- `financing`: parcela mensal from amortization schedule generated on the fly.
- `personal_loan`: `monthlyInstallment` field.
- `credit_card`: minimum payment = 15% of statement (or use a configurable rule). For v0.1, hardcode 15%.
- `overdraft`: monthly interest charge = `balance * monthlyRate`.

### Tests (6+)

1. IncomeCommitted: income R$ 5000, debt R$ 1500 -> 0.30.
2. IncomeCommitted: income R$ 0 -> Infinity.
3. Snapshot with one income + one financing: totalIncome > 0, totalDebt > 0, committedPct sensible.
4. Snapshot with no debts: committedPct = 0, netWorth = totalIncome.
5. Snapshot with weekly income: monthly equivalent = amount * 52/12.
6. Snapshot date in the future: only debts/incomes active at asOf count.

### Suggested commit

```
feat(domain): add FinancialHealthService and IncomeCommittedService
```

---

## Task 13: Barrel exports + final verification

**Files:**
- Create: `src/domain/services/index.ts`
- Create: `src/domain/value-objects/index.ts`
- Modify: nothing else

### `src/domain/services/index.ts`

```ts
export * from "./amortization/price-amortization.service";
export * from "./amortization/sac-amortization.service";
export * from "./cet-calculator.service";
export * from "./debt-payoff-projector.service";
export * from "./payoff-strategy.service";
export * from "./revolving-cost-projector.service";
export * from "./financial-health.service";
export * from "./income-committed.service";
```

### `src/domain/value-objects/index.ts`

```ts
export * from "./money.vo";
export * from "./interest-rate.vo";
export * from "./period.vo";
export * from "./amortization-schedule.vo";
export * from "./email.vo";   // already exists from Plan 2
```

### Verification

```bash
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform test
# Expected: existing 107 + Plan 3 additions = ~165 tests
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform lint
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform typecheck
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform format:check
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform build
```

All exit 0.

### Suggested commit message

```
chore(domain): add barrel exports for services and value objects
```

---

## Hard constraints (apply to every task)

- Working dir: `/Users/fernandes/Projects/sabor-financeiro/sf-platform`.
- No git commits.
- No em-dashes (U+2014), no emoji. Portuguese accents in copy fine.
- Domain layer NEVER imports React, Next, Drizzle, Zod, Resend, Upstash, or any infrastructure code. Allowed: `@/shared/errors` (Result, DomainError), `@/domain/*`.
- All money math goes through `Money`. Never use floating-point arithmetic on cents directly.
- All rates go through `InterestRate`. Never store raw decimals in entities (use VO).
- Tests use deterministic fixtures. Snapshots OK for amortization schedules; commit them to version control.

## Risks and notes

- **Rounding in amortization schedules.** Cumulative rounding error can leave a last-cent residue. The schedule's `from()` invariants accept R$ 0.01 tolerance. Implementations should clean up rounding on the final installment.
- **Newton-Raphson convergence in CET.** Pathological inputs (extreme fees, zero rate) can cause divergence. Tests cover the happy paths; production code should clamp and fallback to a binary search if Newton fails to converge in 100 iterations.
- **Credit card minimum payment** is hardcoded at 15% for v0.1. Real BR minimums are 15% by Bacen rule for revolving, but some cards have different policies. Configurable in v0.2.
- **Monthly equivalent of one-off income.** Decision: a one_off income only contributes to the snapshot for the month it falls in. After that month, it's zero. Document this in the helper.

## Roadmap of suggested commit messages

1. `feat(domain/money): add bigint-backed Money value object with BRL parsing and formatting`
2. `feat(domain/interest-rate): add InterestRate VO with monthly/annual compound conversion`
3. `feat(domain/period): add Period VO with months/days helpers`
4. `feat(domain/amortization-schedule): add immutable schedule VO with invariants`
5. `feat(domain/amortization): add PriceAmortizationService (Sistema Frances)`
6. `feat(domain/amortization): add SacAmortizationService`
7. `feat(domain): add CetCalculatorService via Newton-Raphson`
8. `feat(domain/entities): add Debt, Income, DebtPayment, FinancialSnapshot entity types`
9. `feat(domain): add DebtPayoffProjectorService with extra-payment simulation`
10. `feat(domain): add PayoffStrategyService comparing snowball vs avalanche`
11. `feat(domain): add RevolvingCostProjectorService showing compound growth of revolving credit`
12. `feat(domain): add FinancialHealthService and IncomeCommittedService`
13. `chore(domain): add barrel exports for services and value objects`
