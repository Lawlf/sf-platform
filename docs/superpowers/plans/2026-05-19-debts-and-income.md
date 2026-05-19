# Dívidas + Renda Implementation Plan (Plan 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first user-facing functional features. Cadastro/edição/arquivamento de dívidas (4 kinds: financing, personal_loan, credit_card, overdraft) + cadastro/edição de renda + registro de pagamentos + visualização de dívida com cronograma de amortização. Functional first, polish later.

**Architecture:** New Drizzle schemas (`debts`, `incomes`, `debt_payments`) with kind-discriminated columns for debts. Repositories implement domain ports defined in Plan 3. Use cases orchestrate via injected ports. UI under `app/(app)/app/` with bottom nav scaffolding. All forms use React Hook Form + Zod. Server Actions for mutations.

**Tech Stack:** Existing stack (no new core deps). Adds: react-number-format (BRL mask), date-fns (date helpers) if not already present.

---

## File Structure

```
src/
  domain/
    ports/
      repositories/
        debt.repository.ts                                    # IDebtRepository
        income.repository.ts                                  # IIncomeRepository
        debt-payment.repository.ts                            # IDebtPaymentRepository
  application/
    use-cases/
      income/
        register-income.use-case.ts + test
        update-income.use-case.ts + test
        archive-income.use-case.ts + test
        list-incomes.use-case.ts + test
      debt/
        register-debt.use-case.ts + test                      # discriminated input per kind
        update-debt.use-case.ts + test
        archive-debt.use-case.ts + test
        list-debts.use-case.ts + test
        get-debt-detail.use-case.ts + test                    # debt + amortization schedule + payments
        record-payment.use-case.ts + test
  infrastructure/
    persistence/
      drizzle/
        schema/
          debts.schema.ts                                     # NEW. Discriminated by kind column
          incomes.schema.ts                                   # NEW
          debt-payments.schema.ts                             # NEW
          index.ts                                            # MODIFY: re-export new schemas
        repositories/
          drizzle-debt.repository.ts + it.test
          drizzle-income.repository.ts + it.test
          drizzle-debt-payment.repository.ts + it.test
  presentation/
    http/
      validators/
        debt.validators.ts                                    # Zod schemas for each kind's form
        income.validators.ts
      mappers/
        debt.mapper.ts                                        # entity <-> DTO for UI

app/
  (app)/
    app/
      _components/
        bottom-nav.tsx                                        # 5-slot mobile nav, Server Component
        money-input.tsx                                       # Client Component, BRL mask
        rate-input.tsx                                        # Client Component, % input
        page-shell.tsx                                        # Server Component, max-w + padding wrapper
      dividas/
        page.tsx                                              # list + CTA "Nova divida"
        nova/
          page.tsx                                            # wizard step 1 (escolher tipo)
          _components/
            kind-picker.tsx                                   # client component
            financing-form.tsx
            personal-loan-form.tsx
            credit-card-form.tsx
            overdraft-form.tsx
          financiamento/
            page.tsx                                          # wizard for financing
          emprestimo/
            page.tsx
          cartao/
            page.tsx
          cheque-especial/
            page.tsx
        [id]/
          page.tsx                                            # detalhe + amortization render
          pagar/
            page.tsx                                          # registro pagamento
            _components/
              record-payment-form.tsx
          _actions/
            archive-debt.action.ts
            record-payment.action.ts
        _actions/
          create-debt.action.ts                               # Server Action consumed by all kind forms
      renda/
        page.tsx                                              # list + form combinada
        _components/
          income-form.tsx
        _actions/
          create-income.action.ts
          archive-income.action.ts

drizzle/
  migrations/
    0001_debts_incomes_payments.sql                           # generated
```

---

## Conventions

- **Working directory:** `/Users/fernandes/Projects/sabor-financeiro/sf-platform`.
- **No git commits.**
- **No em-dash, no emoji.** Portuguese accents required in copy.
- **TDD for use cases.** Integration tests for Drizzle repos. Playwright smoke for golden paths.
- **No new core deps without good reason.** `react-number-format` is the standard for BRL masks; install only when first needed.
- **All money in `Money` VO; all rates in `InterestRate`.** Form layer parses raw strings to VOs at the boundary.
- **Discriminated debt schema:** single `debts` table with `kind` enum + kind-specific columns nullable. JSONB column `kind_data` holds kind-specific structured fields (installment purchases on credit_card) to avoid schema explosion.

---

## Domain decisions for v0.1

1. **Currency:** BRL only. No multi-currency in schema (forward-compatible: add `currency` column when v1.0 multi-currency lands).
2. **Rate convention:** effective compound monthly↔annual (matches Plan 3 `InterestRate` VO; Bacen CET style). UI labels rate fields as "Taxa anual (a.a.)" with help text "como informado em contratos CET".
3. **Credit card minimum:** hardcoded 15% of statement (Plan 3 convention). UI shows "Pagamento mínimo: R$ X (15% da fatura)".
4. **Pagamento extra:** boolean `is_extra` on debt_payment. Forma de calcular impacto na quitação fica em simulação (Plan 5).
5. **Arquivamento:** soft action (`status = "paid_off"` ou `"written_off"`). Nunca hard-delete (mantém histórico).
6. **Datas:** `startDate`, `expectedEndDate` armazenados como `timestamp with time zone`. Timezone do usuário fica out-of-scope v0.1 (assume servidor UTC).

---

## Task 1: Drizzle schemas (debts, incomes, debt_payments)

**Files:**
- Create: `src/infrastructure/persistence/drizzle/schema/debts.schema.ts`
- Create: `src/infrastructure/persistence/drizzle/schema/incomes.schema.ts`
- Create: `src/infrastructure/persistence/drizzle/schema/debt-payments.schema.ts`
- Modify: `src/infrastructure/persistence/drizzle/schema/index.ts` (re-export)
- Create: `src/infrastructure/persistence/drizzle/schema/debts.schema.test.ts` (introspection check)

### `debts.schema.ts`

```ts
import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const debtKind = pgEnum("debt_kind", [
  "financing",
  "personal_loan",
  "credit_card",
  "overdraft",
]);
export const debtStatus = pgEnum("debt_status", ["active", "paid_off", "written_off"]);
export const amortizationMethod = pgEnum("amortization_method", ["PRICE", "SAC"]);

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: debtKind("kind").notNull(),
    status: debtStatus("status").notNull().default("active"),
    // Money stored as cents in bigint
    originalPrincipalCents: bigint("original_principal_cents", { mode: "bigint" }).notNull(),
    currentBalanceCents: bigint("current_balance_cents", { mode: "bigint" }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    expectedEndDate: timestamp("expected_end_date", { withTimezone: true }),
    notes: text("notes"),
    // Rate stored as decimal (0.10 = 10%)
    annualRateDecimal: text("annual_rate_decimal"),
    // Term months for financing/personal_loan
    termMonths: integer("term_months"),
    // Financing-specific
    amortMethod: amortizationMethod("amort_method"),
    monthlyInsuranceCents: bigint("monthly_insurance_cents", { mode: "bigint" }),
    monthlyAdminFeeCents: bigint("monthly_admin_fee_cents", { mode: "bigint" }),
    // Personal loan-specific (annualRateDecimal + termMonths reused)
    monthlyInstallmentCents: bigint("monthly_installment_cents", { mode: "bigint" }),
    // Credit card-specific
    creditLimitCents: bigint("credit_limit_cents", { mode: "bigint" }),
    statementDay: integer("statement_day"),
    dueDay: integer("due_day"),
    currentStatementCents: bigint("current_statement_cents", { mode: "bigint" }),
    revolvingBalanceCents: bigint("revolving_balance_cents", { mode: "bigint" }),
    revolvingMonthlyRateDecimal: text("revolving_monthly_rate_decimal"),
    installmentPurchases: jsonb("installment_purchases"),
    // Overdraft-specific
    bankName: text("bank_name"),
    overdraftMonthlyRateDecimal: text("overdraft_monthly_rate_decimal"),
    lastChargeDate: timestamp("last_charge_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("debts_user_id_idx").on(table.userId),
    userStatusIdx: index("debts_user_id_status_idx").on(table.userId, table.status),
  }),
);

export type DebtRow = typeof debts.$inferSelect;
export type NewDebtRow = typeof debts.$inferInsert;
```

Design note: rates stored as `text` to preserve decimal precision (TypeScript numbers OK at runtime but text storage avoids any FP rounding in PG). Mapper converts string ↔ number at the repository boundary.

### `incomes.schema.ts`

```ts
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const incomeFrequency = pgEnum("income_frequency", ["monthly", "weekly", "one_off"]);

export const incomes = pgTable(
  "incomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    frequency: incomeFrequency("frequency").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("incomes_user_id_idx").on(table.userId),
    userActiveIdx: index("incomes_user_id_active_idx").on(table.userId, table.isActive),
  }),
);

export type IncomeRow = typeof incomes.$inferSelect;
export type NewIncomeRow = typeof incomes.$inferInsert;
```

### `debt-payments.schema.ts`

```ts
import { sql } from "drizzle-orm";
import { bigint, boolean, index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { debts } from "./debts.schema";

export const debtPayments = pgTable(
  "debt_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    principalPortionCents: bigint("principal_portion_cents", { mode: "bigint" }).notNull(),
    interestPortionCents: bigint("interest_portion_cents", { mode: "bigint" }).notNull(),
    isExtra: boolean("is_extra").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    debtIdx: index("debt_payments_debt_id_idx").on(table.debtId),
    debtPaidAtIdx: index("debt_payments_debt_id_paid_at_idx").on(table.debtId, table.paidAt),
  }),
);

export type DebtPaymentRow = typeof debtPayments.$inferSelect;
export type NewDebtPaymentRow = typeof debtPayments.$inferInsert;
```

### Update `schema/index.ts`

```ts
export * from "./debt-payments.schema";
export * from "./debts.schema";
export * from "./incomes.schema";
export * from "./magic-link-tokens.schema";
export * from "./oauth-accounts.schema";
export * from "./sessions.schema";
export * from "./users.schema";
```

### Schema test

`src/infrastructure/persistence/drizzle/schema/debts.schema.test.ts`:

```ts
import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { debtPayments, debts, incomes } from "./index";

describe("debts + incomes + debt_payments schema", () => {
  it("declares debts table", () => {
    expect(getTableName(debts)).toBe("debts");
  });
  it("declares incomes table", () => {
    expect(getTableName(incomes)).toBe("incomes");
  });
  it("declares debt_payments table", () => {
    expect(getTableName(debtPayments)).toBe("debt_payments");
  });
  it("debts has kind-discriminator and per-kind columns", () => {
    const cols = Object.keys(debts);
    for (const c of [
      "id",
      "userId",
      "label",
      "kind",
      "status",
      "originalPrincipalCents",
      "currentBalanceCents",
      "startDate",
      "annualRateDecimal",
      "termMonths",
      "amortMethod",
      "creditLimitCents",
      "statementDay",
      "currentStatementCents",
      "revolvingBalanceCents",
      "installmentPurchases",
      "bankName",
      "overdraftMonthlyRateDecimal",
    ]) {
      expect(cols).toContain(c);
    }
  });
});
```

### Verification

```bash
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform test
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform typecheck
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform lint
```

Expected: +4 tests (203 + 4 = 207).

### Suggested commit

```
feat(db): add debts, incomes, debt_payments Drizzle schemas
```

---

## Task 2: Generate + apply migration to Supabase

**Files:** `drizzle/migrations/0001_*.sql` (auto-named)

### Steps

- [ ] **Step 1: Verify `.env.local` has `DATABASE_URL` (already configured from Plan 1).**

- [ ] **Step 2: Generate migration**

```bash
cd /Users/fernandes/Projects/sabor-financeiro/sf-platform && pnpm db:generate
```

Expected: new SQL file under `drizzle/migrations/` creating 3 enums (`debt_kind`, `debt_status`, `amortization_method`, `income_frequency`), 3 tables, and indexes.

- [ ] **Step 3: Inspect the SQL** for correctness. Verify FK to `users.id` with `ON DELETE CASCADE`, FK from `debt_payments.debt_id` to `debts.id`.

- [ ] **Step 4: Apply migration**

```bash
cd /Users/fernandes/Projects/sabor-financeiro/sf-platform && pnpm db:migrate
```

Expected: success message.

- [ ] **Step 5: Verify tables exist in Supabase**

Use the same SELECT pattern from Plan 1 Task 13. Confirm `debts`, `incomes`, `debt_payments` show up in `information_schema.tables`.

- [ ] **Step 6: `pnpm db:check`** returns no drift.

### Suggested commit

```
feat(db): generate migration for debts/incomes/debt_payments
```

---

## Task 3: Domain ports (Debt, Income, Payment repositories)

**Files:**
- Create: `src/domain/ports/repositories/debt.repository.ts`
- Create: `src/domain/ports/repositories/income.repository.ts`
- Create: `src/domain/ports/repositories/debt-payment.repository.ts`

### `debt.repository.ts`

```ts
import type { DebtEntity, DebtStatus } from "@/domain/entities/debt.entity";

export interface DebtRepository {
  findById(id: string): Promise<DebtEntity | null>;
  listForUser(userId: string, opts?: { status?: DebtStatus | "all" }): Promise<DebtEntity[]>;
  create(entity: DebtEntity): Promise<DebtEntity>;
  update(entity: DebtEntity): Promise<DebtEntity>;
  setStatus(id: string, status: DebtStatus): Promise<void>;
}
```

### `income.repository.ts`

```ts
import type { IncomeEntity } from "@/domain/entities/income.entity";

export interface IncomeRepository {
  findById(id: string): Promise<IncomeEntity | null>;
  listForUser(userId: string, opts?: { onlyActive?: boolean }): Promise<IncomeEntity[]>;
  create(entity: IncomeEntity): Promise<IncomeEntity>;
  update(entity: IncomeEntity): Promise<IncomeEntity>;
  setActive(id: string, isActive: boolean): Promise<void>;
}
```

### `debt-payment.repository.ts`

```ts
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";

export interface DebtPaymentRepository {
  listForDebt(debtId: string): Promise<DebtPaymentEntity[]>;
  create(entity: DebtPaymentEntity): Promise<DebtPaymentEntity>;
}
```

### Suggested commit

```
feat(domain/ports): add Debt, Income, DebtPayment repository ports
```

---

## Task 4: Drizzle implementations of new repositories

**Files:**
- Create: `src/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository.ts` + integration test
- Create: `src/infrastructure/persistence/drizzle/repositories/drizzle-income.repository.ts` + IT
- Create: `src/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository.ts` + IT

### DebtRepository implementation pattern

Map between row (storage form with cents bigint + rate text) and `DebtEntity` (with `Money` and `InterestRate` VOs):

```ts
import { and, desc, eq } from "drizzle-orm";

import type { DebtEntity, DebtStatus } from "@/domain/entities/debt.entity";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors";

import { getDb } from "../client";
import { debts, type DebtRow, type NewDebtRow } from "../schema/debts.schema";

function rowToEntity(row: DebtRow): DebtEntity {
  const base = {
    id: row.id,
    userId: row.userId,
    label: row.label,
    status: row.status,
    originalPrincipal: Money.fromCents(row.originalPrincipalCents),
    currentBalance: Money.fromCents(row.currentBalanceCents),
    startDate: row.startDate,
    expectedEndDate: row.expectedEndDate,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  switch (row.kind) {
    case "financing": {
      const rate = InterestRate.fromAnnual(Number(row.annualRateDecimal ?? "0"));
      if (!isOk(rate)) throw new Error("Invalid stored annualRateDecimal");
      return {
        ...base,
        kind: "financing",
        amortizationMethod: row.amortMethod ?? "PRICE",
        annualInterestRate: rate.value,
        termMonths: row.termMonths ?? 0,
        monthlyInsurance: row.monthlyInsuranceCents
          ? Money.fromCents(row.monthlyInsuranceCents)
          : null,
        monthlyAdminFee: row.monthlyAdminFeeCents ? Money.fromCents(row.monthlyAdminFeeCents) : null,
      } as DebtEntity;
    }
    case "personal_loan": {
      const rate = InterestRate.fromAnnual(Number(row.annualRateDecimal ?? "0"));
      if (!isOk(rate)) throw new Error("Invalid stored annualRateDecimal");
      return {
        ...base,
        kind: "personal_loan",
        annualInterestRate: rate.value,
        termMonths: row.termMonths ?? 0,
        monthlyInstallment: row.monthlyInstallmentCents
          ? Money.fromCents(row.monthlyInstallmentCents)
          : Money.zero(),
      } as DebtEntity;
    }
    case "credit_card": {
      const revRateRaw = row.revolvingMonthlyRateDecimal;
      const revRate = revRateRaw ? InterestRate.fromMonthly(Number(revRateRaw)) : null;
      if (revRate && !isOk(revRate)) {
        throw new Error("Invalid stored revolvingMonthlyRateDecimal");
      }
      return {
        ...base,
        kind: "credit_card",
        creditLimit: row.creditLimitCents ? Money.fromCents(row.creditLimitCents) : Money.zero(),
        statementDay: row.statementDay ?? 1,
        dueDay: row.dueDay ?? 1,
        currentStatement: row.currentStatementCents
          ? Money.fromCents(row.currentStatementCents)
          : Money.zero(),
        revolvingBalance: row.revolvingBalanceCents
          ? Money.fromCents(row.revolvingBalanceCents)
          : null,
        revolvingMonthlyRate: revRate && isOk(revRate) ? revRate.value : null,
        installmentPurchases: deserializeInstallments(row.installmentPurchases),
      } as DebtEntity;
    }
    case "overdraft": {
      const rate = InterestRate.fromMonthly(Number(row.overdraftMonthlyRateDecimal ?? "0"));
      if (!isOk(rate)) throw new Error("Invalid stored overdraftMonthlyRateDecimal");
      return {
        ...base,
        kind: "overdraft",
        bankName: row.bankName ?? "",
        monthlyRate: rate.value,
        lastChargeDate: row.lastChargeDate,
      } as DebtEntity;
    }
  }
}

function entityToRow(entity: DebtEntity): NewDebtRow {
  const base = {
    id: entity.id,
    userId: entity.userId,
    label: entity.label,
    kind: entity.kind,
    status: entity.status,
    originalPrincipalCents: entity.originalPrincipal.toCents(),
    currentBalanceCents: entity.currentBalance.toCents(),
    startDate: entity.startDate,
    expectedEndDate: entity.expectedEndDate,
    notes: entity.notes,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };

  switch (entity.kind) {
    case "financing":
      return {
        ...base,
        amortMethod: entity.amortizationMethod,
        annualRateDecimal: entity.annualInterestRate.toDecimal().toString(),
        termMonths: entity.termMonths,
        monthlyInsuranceCents: entity.monthlyInsurance?.toCents() ?? null,
        monthlyAdminFeeCents: entity.monthlyAdminFee?.toCents() ?? null,
      };
    case "personal_loan":
      return {
        ...base,
        annualRateDecimal: entity.annualInterestRate.toDecimal().toString(),
        termMonths: entity.termMonths,
        monthlyInstallmentCents: entity.monthlyInstallment.toCents(),
      };
    case "credit_card":
      return {
        ...base,
        creditLimitCents: entity.creditLimit.toCents(),
        statementDay: entity.statementDay,
        dueDay: entity.dueDay,
        currentStatementCents: entity.currentStatement.toCents(),
        revolvingBalanceCents: entity.revolvingBalance?.toCents() ?? null,
        revolvingMonthlyRateDecimal: entity.revolvingMonthlyRate?.toDecimal().toString() ?? null,
        installmentPurchases: serializeInstallments(entity.installmentPurchases),
      };
    case "overdraft":
      return {
        ...base,
        bankName: entity.bankName,
        overdraftMonthlyRateDecimal: entity.monthlyRate.toDecimal().toString(),
        lastChargeDate: entity.lastChargeDate,
      };
  }
}

function deserializeInstallments(raw: unknown) {
  if (!raw || !Array.isArray(raw)) return [];
  // each entry has total/monthlyValue stored as cents bigint strings or numbers; map to Money
  return raw.map((p: any) => ({
    description: p.description,
    total: Money.fromCents(BigInt(p.totalCents)),
    installmentsTotal: p.installmentsTotal,
    installmentsRemaining: p.installmentsRemaining,
    monthlyValue: Money.fromCents(BigInt(p.monthlyValueCents)),
  }));
}

function serializeInstallments(list: { description: string; total: any; installmentsTotal: number; installmentsRemaining: number; monthlyValue: any }[]) {
  return list.map((p) => ({
    description: p.description,
    totalCents: p.total.toCents().toString(),
    installmentsTotal: p.installmentsTotal,
    installmentsRemaining: p.installmentsRemaining,
    monthlyValueCents: p.monthlyValue.toCents().toString(),
  }));
}

export class DrizzleDebtRepository implements DebtRepository {
  async findById(id: string) {
    const rows = await getDb().select().from(debts).where(eq(debts.id, id)).limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listForUser(userId: string, opts?: { status?: DebtStatus | "all" }) {
    const status = opts?.status;
    const conditions =
      !status || status === "all"
        ? eq(debts.userId, userId)
        : and(eq(debts.userId, userId), eq(debts.status, status));
    const rows = await getDb().select().from(debts).where(conditions).orderBy(desc(debts.createdAt));
    return rows.map(rowToEntity);
  }

  async create(entity: DebtEntity) {
    const rows = await getDb().insert(debts).values(entityToRow(entity)).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert debt");
    return rowToEntity(row);
  }

  async update(entity: DebtEntity) {
    const rows = await getDb()
      .update(debts)
      .set({ ...entityToRow(entity), updatedAt: new Date() })
      .where(eq(debts.id, entity.id))
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to update debt");
    return rowToEntity(row);
  }

  async setStatus(id: string, status: DebtStatus) {
    await getDb().update(debts).set({ status, updatedAt: new Date() }).where(eq(debts.id, id));
  }
}
```

### Income + Payment implementations

Smaller, analogous to existing repos (User/Session pattern). Income uses `amountCents` bigint, payment stores principal/interest/amount in cents.

### Integration tests

Pattern identical to Plan 2 Drizzle repo IT tests: create user via `DrizzleUserRepository`, then exercise repo CRUD, cleanup with email prefix at end.

For brevity, each IT covers: create+findById, listForUser, update, setStatus/setActive, edge cases (not-found returns null).

Expect 3-5 tests per repo, ~10-15 IT total.

### Suggested commits

```
feat(infra/db): add DrizzleDebtRepository
feat(infra/db): add DrizzleIncomeRepository
feat(infra/db): add DrizzleDebtPaymentRepository
```

---

## Task 5: Income use cases

**Files:**
- Create: `src/application/use-cases/income/{register,update,archive,list}-income.use-case.ts` + tests

### RegisterIncome

```ts
import type { Clock } from "@/domain/ports/clock.port";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import type { IncomeEntity, IncomeFrequency } from "@/domain/entities/income.entity";
import type { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors";

export interface RegisterIncomeDeps {
  incomes: IncomeRepository;
  clock: Clock;
}

export interface RegisterIncomeInput {
  userId: string;
  label: string;
  amount: Money;
  frequency: IncomeFrequency;
  startDate: Date;
  endDate: Date | null;
}

export async function registerIncome(
  deps: RegisterIncomeDeps,
  input: RegisterIncomeInput,
): Promise<Result<IncomeEntity, never>> {
  const now = deps.clock.now();
  const entity: IncomeEntity = {
    id: crypto.randomUUID(),
    userId: input.userId,
    label: input.label,
    amount: input.amount,
    frequency: input.frequency,
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: true,
  };
  // repo is unaware of createdAt/updatedAt (set by DB)
  void now;
  const persisted = await deps.incomes.create(entity);
  return ok(persisted);
}
```

Tests: 2-3 tests with mocked `IncomeRepository` and `Clock`.

### UpdateIncome / ArchiveIncome / ListIncomes

Same pattern (load by id, mutate, save). Each ~30 lines. Tests mock the repo.

### Suggested commits

```
feat(application): add RegisterIncome / UpdateIncome / ArchiveIncome / ListIncomes use cases
```

---

## Task 6: Debt use cases (Register/Update/Archive/List/GetDetail)

**Files:**
- Create: `src/application/use-cases/debt/register-debt.use-case.ts` + test
- Create: `src/application/use-cases/debt/update-debt.use-case.ts` + test
- Create: `src/application/use-cases/debt/archive-debt.use-case.ts` + test
- Create: `src/application/use-cases/debt/list-debts.use-case.ts` + test
- Create: `src/application/use-cases/debt/get-debt-detail.use-case.ts` + test

### RegisterDebt (per kind via discriminated input)

```ts
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { DebtEntity, DebtKind } from "@/domain/entities/debt.entity";
import type { Clock } from "@/domain/ports/clock.port";
import { ok, type Result } from "@/shared/errors";

export interface RegisterDebtDeps {
  debts: DebtRepository;
  clock: Clock;
}

// Input is a "raw form" version of DebtEntity, MINUS id/userId/createdAt/updatedAt/status/currentBalance.
// Use case sets id (uuid), status="active", currentBalance=originalPrincipal initially.
export type RegisterDebtInput = {
  userId: string;
  label: string;
  notes: string | null;
  startDate: Date;
  expectedEndDate: Date | null;
} & (
  | {
      kind: "financing";
      originalPrincipal: import("@/domain/value-objects/money.vo").Money;
      annualInterestRate: import("@/domain/value-objects/interest-rate.vo").InterestRate;
      termMonths: number;
      amortizationMethod: "PRICE" | "SAC";
      monthlyInsurance: import("@/domain/value-objects/money.vo").Money | null;
      monthlyAdminFee: import("@/domain/value-objects/money.vo").Money | null;
    }
  | {
      kind: "personal_loan";
      originalPrincipal: import("@/domain/value-objects/money.vo").Money;
      annualInterestRate: import("@/domain/value-objects/interest-rate.vo").InterestRate;
      termMonths: number;
      monthlyInstallment: import("@/domain/value-objects/money.vo").Money;
    }
  | {
      kind: "credit_card";
      creditLimit: import("@/domain/value-objects/money.vo").Money;
      currentStatement: import("@/domain/value-objects/money.vo").Money;
      statementDay: number;
      dueDay: number;
      revolvingBalance: import("@/domain/value-objects/money.vo").Money | null;
      revolvingMonthlyRate: import("@/domain/value-objects/interest-rate.vo").InterestRate | null;
      installmentPurchases: import("@/domain/entities/debt.entity").InstallmentPurchase[];
    }
  | {
      kind: "overdraft";
      currentBalance: import("@/domain/value-objects/money.vo").Money;
      bankName: string;
      monthlyRate: import("@/domain/value-objects/interest-rate.vo").InterestRate;
    }
);

export async function registerDebt(
  deps: RegisterDebtDeps,
  input: RegisterDebtInput,
): Promise<Result<DebtEntity, never>> {
  const now = deps.clock.now();
  const base = {
    id: crypto.randomUUID(),
    userId: input.userId,
    label: input.label,
    status: "active" as const,
    startDate: input.startDate,
    expectedEndDate: input.expectedEndDate,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  let entity: DebtEntity;
  switch (input.kind) {
    case "financing":
      entity = {
        ...base,
        kind: "financing",
        originalPrincipal: input.originalPrincipal,
        currentBalance: input.originalPrincipal,
        amortizationMethod: input.amortizationMethod,
        annualInterestRate: input.annualInterestRate,
        termMonths: input.termMonths,
        monthlyInsurance: input.monthlyInsurance,
        monthlyAdminFee: input.monthlyAdminFee,
      };
      break;
    case "personal_loan":
      entity = {
        ...base,
        kind: "personal_loan",
        originalPrincipal: input.originalPrincipal,
        currentBalance: input.originalPrincipal,
        annualInterestRate: input.annualInterestRate,
        termMonths: input.termMonths,
        monthlyInstallment: input.monthlyInstallment,
      };
      break;
    case "credit_card":
      // For credit cards, originalPrincipal=0 makes sense; currentBalance = currentStatement + revolving + sum(installmentPurchases.remaining * monthlyValue)
      // Simplification: currentBalance = currentStatement + (revolvingBalance ?? 0)
      entity = {
        ...base,
        kind: "credit_card",
        originalPrincipal: input.currentStatement,
        currentBalance: input.revolvingBalance
          ? input.currentStatement.add(input.revolvingBalance)
          : input.currentStatement,
        creditLimit: input.creditLimit,
        statementDay: input.statementDay,
        dueDay: input.dueDay,
        currentStatement: input.currentStatement,
        revolvingBalance: input.revolvingBalance,
        revolvingMonthlyRate: input.revolvingMonthlyRate,
        installmentPurchases: input.installmentPurchases,
      };
      break;
    case "overdraft":
      entity = {
        ...base,
        kind: "overdraft",
        originalPrincipal: input.currentBalance,
        currentBalance: input.currentBalance,
        bankName: input.bankName,
        monthlyRate: input.monthlyRate,
        lastChargeDate: null,
      };
      break;
  }
  const persisted = await deps.debts.create(entity);
  return ok(persisted);
}
```

Tests: 4 tests, one per kind, asserting repo.create called with the right entity.

### GetDebtDetail

```ts
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { AmortizationSchedule } from "@/domain/value-objects/amortization-schedule.vo";
import { PriceAmortizationService } from "@/domain/services/amortization/price-amortization.service";
import { SacAmortizationService } from "@/domain/services/amortization/sac-amortization.service";
import { Forbidden } from "@/domain/errors";
import { err, isOk, ok, type Result } from "@/shared/errors";

export interface GetDebtDetailDeps {
  debts: DebtRepository;
  payments: DebtPaymentRepository;
}

export interface GetDebtDetailInput {
  userId: string;
  debtId: string;
}

export interface GetDebtDetailOutput {
  debt: DebtEntity;
  amortization: AmortizationSchedule | null;       // null for credit_card / overdraft (no fixed schedule)
  payments: DebtPaymentEntity[];
}

export async function getDebtDetail(
  deps: GetDebtDetailDeps,
  input: GetDebtDetailInput,
): Promise<Result<GetDebtDetailOutput, Forbidden | import("@/domain/errors").DebtNotFound>> {
  // Define DebtNotFound in src/domain/errors/financial-errors.ts (add to plan)
  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new (await import("@/domain/errors").then((m) => m.DebtNotFound))("Divida nao encontrada."));
  if (debt.userId !== input.userId) return err(new Forbidden("Acesso negado."));

  let amortization: AmortizationSchedule | null = null;
  if (debt.kind === "financing") {
    const svc = debt.amortizationMethod === "PRICE" ? PriceAmortizationService : SacAmortizationService;
    const s = svc.generate({
      principal: debt.originalPrincipal,
      annualRate: debt.annualInterestRate,
      termMonths: debt.termMonths,
    });
    if (isOk(s)) amortization = s.value;
  } else if (debt.kind === "personal_loan") {
    const s = PriceAmortizationService.generate({
      principal: debt.originalPrincipal,
      annualRate: debt.annualInterestRate,
      termMonths: debt.termMonths,
    });
    if (isOk(s)) amortization = s.value;
  }

  const payments = await deps.payments.listForDebt(debt.id);
  return ok({ debt, amortization, payments });
}
```

Note: `DebtNotFound` needs to be added to `src/domain/errors/auth-errors.ts` or a new `domain-errors.ts` file. Plan: add to `src/domain/errors/financial-errors.ts` (`DebtNotFound`, `IncomeNotFound`).

### Suggested commits

```
feat(application): add Debt register/update/archive/list/get-detail use cases
```

---

## Task 7: RecordPayment use case

**Files:**
- Create: `src/application/use-cases/debt/record-payment.use-case.ts` + test

```ts
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { Money } from "@/domain/value-objects/money.vo";
import type { Clock } from "@/domain/ports/clock.port";
import { Forbidden } from "@/domain/errors";
import { DebtNotFound, InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import { err, ok, type Result } from "@/shared/errors";

export interface RecordPaymentDeps {
  debts: DebtRepository;
  payments: DebtPaymentRepository;
  clock: Clock;
}

export interface RecordPaymentInput {
  userId: string;
  debtId: string;
  amount: Money;
  principalPortion: Money;
  interestPortion: Money;
  isExtra: boolean;
  paidAt: Date;
}

export async function recordPayment(
  deps: RecordPaymentDeps,
  input: RecordPaymentInput,
): Promise<Result<DebtPaymentEntity, DebtNotFound | Forbidden | InvalidAmortizationParamsError>> {
  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new DebtNotFound("Divida nao encontrada."));
  if (debt.userId !== input.userId) return err(new Forbidden("Acesso negado."));

  // amount must equal principal + interest
  const sumCents = input.principalPortion.toCents() + input.interestPortion.toCents();
  if (input.amount.toCents() !== sumCents) {
    return err(
      new InvalidAmortizationParamsError(
        "amount deve ser igual a principal_portion + interest_portion.",
      ),
    );
  }

  // Apply principal to currentBalance
  const newBalance = debt.currentBalance.subtract(input.principalPortion);
  const updated: DebtEntity = {
    ...debt,
    currentBalance: newBalance.isNegative() ? input.amount.subtract(input.amount) /* zero */ : newBalance,
    status: newBalance.isZero() || newBalance.isNegative() ? "paid_off" : debt.status,
    updatedAt: deps.clock.now(),
  };
  await deps.debts.update(updated);

  const payment: DebtPaymentEntity = {
    id: crypto.randomUUID(),
    debtId: input.debtId,
    paidAt: input.paidAt,
    amount: input.amount,
    principalPortion: input.principalPortion,
    interestPortion: input.interestPortion,
    isExtra: input.isExtra,
  };
  const persisted = await deps.payments.create(payment);
  return ok(persisted);
}
```

Tests: 5 (happy path, debt not found, forbidden, amount mismatch, payoff transitions status).

### Suggested commit

```
feat(application): add RecordPayment use case with balance update
```

---

## Task 8: Bottom nav layout + page shell components

**Files:**
- Create: `app/(app)/app/_components/bottom-nav.tsx`
- Create: `app/(app)/app/_components/page-shell.tsx`
- Modify: `app/(app)/layout.tsx` (mount bottom nav)

### Bottom nav

5 slots: Início (`/app`), Dívidas (`/app/dividas`), Simular (`/app/simular` - placeholder), Conteúdo (`/app/conteudo` - placeholder), Perfil (`/app/perfil`). Sticky bottom, glass-light, lucide icons.

```tsx
import Link from "next/link";
import { BookOpen, HomeIcon, PlusCircle, UserRound, Wallet } from "lucide-react";

export function BottomNav() {
  const items = [
    { href: "/app", label: "Início", icon: HomeIcon },
    { href: "/app/dividas", label: "Dívidas", icon: Wallet },
    { href: "/app/simular", label: "Simular", icon: PlusCircle, fab: true },
    { href: "/app/conteudo", label: "Conteúdo", icon: BookOpen },
    { href: "/app/perfil", label: "Perfil", icon: UserRound },
  ];
  return (
    <nav
      aria-label="Navegacao principal"
      className="glass-light fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-md items-center justify-around px-4 py-2"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-w-12 flex-col items-center gap-0.5 text-xs"
            aria-label={item.label}
          >
            <Icon className={item.fab ? "h-7 w-7" : "h-5 w-5"} strokeWidth={1.75} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

### PageShell

```tsx
import type { ReactNode } from "react";

export function PageShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      {title ? <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-brand-800)]">{title}</h1> : null}
      {children}
    </main>
  );
}
```

### Mount

In `app/(app)/layout.tsx`, after the header (already in place from previous work), add `<BottomNav />` as a sibling. Adjust the main content `pb-24` so it doesn't overlap with the fixed nav. The header sticky stays.

### Suggested commit

```
feat(ui/app): add bottom nav and page shell for logged area
```

---

## Task 9: Money + Rate input components

**Files:**
- Create: `app/(app)/app/_components/money-input.tsx`
- Create: `app/(app)/app/_components/rate-input.tsx`

### MoneyInput

Brazilian input with auto-masking. Use a controlled component that formats `bigint cents` to "R$ 1.234,56" display and emits `bigint cents` on change.

```tsx
"use client";

import { useId } from "react";
import { type Control, Controller } from "react-hook-form";

export interface MoneyInputProps<TFieldValues extends Record<string, unknown>> {
  control: Control<TFieldValues>;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export function MoneyInput<TFieldValues extends Record<string, unknown>>(props: MoneyInputProps<TFieldValues>) {
  const inputId = useId();

  return (
    <Controller
      control={props.control}
      name={props.name as never}
      render={({ field, fieldState }) => (
        <label htmlFor={inputId} className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{props.label}</span>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            placeholder={props.placeholder ?? "R$ 0,00"}
            value={formatCentsForDisplay(field.value as bigint | null)}
            onChange={(e) => field.onChange(parseDisplayToCents(e.target.value))}
            onBlur={field.onBlur}
            aria-required={props.required}
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
          />
          {fieldState.error ? (
            <span role="alert" className="text-xs text-[color:var(--color-negative)]">
              {fieldState.error.message}
            </span>
          ) : null}
        </label>
      )}
    />
  );
}

function formatCentsForDisplay(cents: bigint | null): string {
  if (cents === null || cents === undefined) return "";
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  return `${negative ? "-" : ""}${reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}

function parseDisplayToCents(raw: string): bigint | null {
  if (raw.trim() === "") return null;
  // remove R$, spaces, dots (thousands), keep comma as decimal
  const digits = raw.replace(/[^\d,-]/g, "").replace(",", ".");
  const num = Number.parseFloat(digits);
  if (!Number.isFinite(num)) return null;
  return BigInt(Math.round(num * 100));
}
```

### RateInput

Accepts decimal "10" representing 10%. Stores as decimal number (0.10). Mask: type number, suffix "%". Validate finite.

```tsx
"use client";

import { useId } from "react";
import { type Control, Controller } from "react-hook-form";

export interface RateInputProps<TFieldValues extends Record<string, unknown>> {
  control: Control<TFieldValues>;
  name: string;
  label: string;
  helper?: string;
  required?: boolean;
}

export function RateInput<TFieldValues extends Record<string, unknown>>(props: RateInputProps<TFieldValues>) {
  const inputId = useId();
  return (
    <Controller
      control={props.control}
      name={props.name as never}
      render={({ field, fieldState }) => (
        <label htmlFor={inputId} className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{props.label}</span>
          <div className="relative">
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={field.value === null || field.value === undefined ? "" : String(field.value)}
              onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
              onBlur={field.onBlur}
              className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 pr-10 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
              aria-required={props.required}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-70">
              %
            </span>
          </div>
          {props.helper ? <span className="text-xs opacity-70">{props.helper}</span> : null}
          {fieldState.error ? (
            <span role="alert" className="text-xs text-[color:var(--color-negative)]">
              {fieldState.error.message}
            </span>
          ) : null}
        </label>
      )}
    />
  );
}
```

Use cases convert this percentage to decimal via `value / 100` before constructing `InterestRate.fromAnnual`.

### Suggested commit

```
feat(ui/app): add MoneyInput and RateInput form components
```

---

## Task 10: Income UI (/app/renda)

**Files:**
- Create: `app/(app)/app/renda/page.tsx`
- Create: `app/(app)/app/renda/_components/income-form.tsx`
- Create: `app/(app)/app/renda/_actions/create-income.action.ts`
- Create: `app/(app)/app/renda/_actions/archive-income.action.ts`

### Page (Server Component)

Lists the user's incomes (active first, archived below collapsed). CTA "Adicionar renda" opens the form inline (or via a sheet). For v0.1, render the form below the list directly.

### Form (Client Component)

React Hook Form with:
- `label: string`
- `amountCents: bigint`
- `frequency: "monthly" | "weekly" | "one_off"`
- `startDate: string` (ISO via `<input type="date">`)
- `endDate: string | null`

On submit, calls `createIncomeAction(formData)` via Server Action. Server Action loads current user, parses, calls `registerIncome` use case, revalidates `/app/renda`.

### Action

```ts
"use server";

import { revalidatePath } from "next/cache";

import { registerIncome } from "@/application/use-cases/income/register-income.use-case";
import { incomeFrequency } from "@/infrastructure/persistence/drizzle/schema/incomes.schema";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { incomeFormSchema } from "@/presentation/http/validators/income.validators";
// + necessary repos and Clock

export async function createIncomeAction(formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser({/* deps */});
  const parsed = incomeFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };
  }
  // build Money + Income input, call registerIncome
  // revalidatePath("/app/renda");
  return { ok: true };
}
```

Validators in `src/presentation/http/validators/income.validators.ts`:

```ts
import { z } from "zod";

export const incomeFormSchema = z.object({
  label: z.string().min(1, "Informe um rotulo.").max(120),
  amountCents: z.coerce.bigint().positive("Valor deve ser positivo."),
  frequency: z.enum(["monthly", "weekly", "one_off"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().default(null),
});
```

### Suggested commit

```
feat(ui/renda): add income list and create/archive UI
```

---

## Task 11: Debt list page + nova route group

**Files:**
- Create: `app/(app)/app/dividas/page.tsx` (list + filter by status)
- Create: `app/(app)/app/dividas/nova/page.tsx` (kind picker)
- Create: `app/(app)/app/dividas/nova/_components/kind-picker.tsx`

### List

Server Component. Calls `listDebts` use case. Renders cards:

```
[label]                            [status]
[kind label] - saldo R$ X
juros: 10% a.a. - parcela: R$ Y
[Ver detalhe]
```

Filter buttons: Ativas (default), Quitadas, Todas.

### Kind picker

Client Component. 4 buttons / cards:

```
[Financiamento]   Imovel/veiculo (Price ou SAC)
[Emprestimo]      Pessoal/consignado, parcelas fixas
[Cartao]          Fatura, parcelamento, rotativo
[Cheque especial] Limite no banco, juros diarios
```

Clicking navigates to `/app/dividas/nova/financiamento`, etc.

### Suggested commit

```
feat(ui/dividas): add list page and kind picker for new debt
```

---

## Task 12: Debt wizard forms (4 kinds)

**Files:**
- Create: `app/(app)/app/dividas/nova/financiamento/page.tsx` + `_components/financing-form.tsx`
- Create: `app/(app)/app/dividas/nova/emprestimo/page.tsx` + `_components/personal-loan-form.tsx`
- Create: `app/(app)/app/dividas/nova/cartao/page.tsx` + `_components/credit-card-form.tsx`
- Create: `app/(app)/app/dividas/nova/cheque-especial/page.tsx` + `_components/overdraft-form.tsx`
- Create: `app/(app)/app/dividas/_actions/create-debt.action.ts`
- Create: `src/presentation/http/validators/debt.validators.ts` (one Zod schema per kind)

### Forms (single-page, no step pagination for v0.1)

Each kind form is a Client Component using React Hook Form + Zod resolver. Fields per the entity definition. Currency fields use `MoneyInput`, rate fields use `RateInput`.

Example for **Financiamento**:

- `label` text
- `originalPrincipal` MoneyInput
- `annualInterestRate` RateInput (helper: "como informado em contrato CET (anual)")
- `termMonths` number input
- `amortizationMethod` radio (PRICE/SAC)
- `monthlyInsurance` MoneyInput (optional)
- `monthlyAdminFee` MoneyInput (optional)
- `startDate` date input
- `notes` textarea (optional)

On submit -> `createDebtAction(kind, formData)`.

### Action

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import { requireUser } from "@/presentation/http/middleware/require-user";
import {
  creditCardFormSchema,
  financingFormSchema,
  overdraftFormSchema,
  personalLoanFormSchema,
} from "@/presentation/http/validators/debt.validators";
import { Money } from "@/domain/value-objects/money.vo";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
// + drizzle deps for debts repo

type DebtKindParam = "financing" | "personal_loan" | "credit_card" | "overdraft";

export async function createDebtAction(
  kind: DebtKindParam,
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const user = await requireUser({ /* deps */ });
  const raw = Object.fromEntries(formData.entries());

  // For each kind, parse with the appropriate schema, construct Money/InterestRate, and call registerDebt.
  // Example for financing:
  if (kind === "financing") {
    const parsed = financingFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };
    const principal = Money.fromCents(BigInt(parsed.data.principalCents));
    const rate = InterestRate.fromAnnual(parsed.data.annualRatePct / 100);
    if (!rate.ok) return { ok: false, message: "Taxa invalida." };
    // Build input + call registerDebt; collect id; redirect to /app/dividas/[id]
  }
  // ... similar for other kinds

  return { ok: true, id: "stub" };
}
```

### Suggested commits

```
feat(ui/dividas): add financing wizard form
feat(ui/dividas): add personal_loan wizard form
feat(ui/dividas): add credit_card wizard form
feat(ui/dividas): add overdraft wizard form
```

---

## Task 13: Debt detail page

**Files:**
- Create: `app/(app)/app/dividas/[id]/page.tsx`
- Create: `app/(app)/app/dividas/[id]/_actions/archive-debt.action.ts`

Server Component. Calls `getDebtDetail({ userId, debtId })`. Renders:

- Header: label, kind, status, "Arquivar" / "Marcar como paga" buttons.
- Summary card: saldo atual, parcela, taxa, data de quitação prevista.
- Amortization render: table-like list of installments. For long schedules (e.g., 360), paginate or show first 12 + last 6 with a "Ver todas" toggle.
- Payments list: each row shows paidAt, amount, principal, interest, is_extra badge.
- CTA: "Registrar pagamento" -> `/app/dividas/[id]/pagar`.

### Suggested commit

```
feat(ui/dividas): add debt detail page with amortization render and payments list
```

---

## Task 14: Record payment UI (/app/dividas/[id]/pagar)

**Files:**
- Create: `app/(app)/app/dividas/[id]/pagar/page.tsx`
- Create: `app/(app)/app/dividas/[id]/pagar/_components/record-payment-form.tsx`
- Create: `app/(app)/app/dividas/[id]/pagar/_actions/record-payment.action.ts`

Form: paidAt (date, default today), amount (MoneyInput), principalPortion (MoneyInput), interestPortion (MoneyInput auto-calculated as amount - principal), is_extra checkbox.

For convenience: a "Auto-preencher próxima parcela" button when the debt has an amortization schedule. Clicking populates form from `schedule.installmentAt(nextUnpaidMonth)`.

Server Action calls `recordPayment` use case, revalidates the detail page, redirects on success.

### Suggested commit

```
feat(ui/dividas): add record-payment form and action
```

---

## Task 15: E2E smoke + final verification

**Files:**
- Modify: `tests-e2e/smoke.spec.ts` (or new `tests-e2e/debts.spec.ts`)

Add Playwright tests for golden paths (requires signed-in user; use a test fixture or skip in this iteration).

Plus full unit + IT + build pass:

```bash
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform test
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform test:it
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform lint
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform typecheck
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform format:check
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform build
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform test:e2e
```

All exit 0.

### Suggested commit

```
chore(test): add e2e smoke for debts and income flows
```

---

## Roadmap of suggested commit messages

1. `feat(db): add debts, incomes, debt_payments Drizzle schemas`
2. `feat(db): generate migration for debts/incomes/debt_payments`
3. `feat(domain/ports): add Debt, Income, DebtPayment repository ports`
4. `feat(infra/db): add DrizzleDebtRepository / Income / DebtPayment with integration tests`
5. `feat(application): add Income use cases (register/update/archive/list)`
6. `feat(application): add Debt use cases (register/update/archive/list/get-detail)`
7. `feat(application): add RecordPayment use case with balance update`
8. `feat(ui/app): add bottom nav and page shell for logged area`
9. `feat(ui/app): add MoneyInput and RateInput form components`
10. `feat(ui/renda): add income list and create/archive UI`
11. `feat(ui/dividas): add list page and kind picker for new debt`
12. `feat(ui/dividas): add wizard forms (financing, personal_loan, credit_card, overdraft)`
13. `feat(ui/dividas): add debt detail page with amortization render`
14. `feat(ui/dividas): add record-payment form and action`
15. `chore(test): add e2e smoke for debts and income flows`

---

## Hard constraints (apply to every task)

- Working directory: `/Users/fernandes/Projects/sabor-financeiro/sf-platform`.
- No git commits.
- No em-dash (U+2014), no emoji. Portuguese accents in copy welcome.
- Domain layer never imports React, Next, Drizzle, Zod, or any infrastructure code.
- All Money in `Money` VO, all rates in `InterestRate`. Form layer parses raw strings to VOs at the boundary.
- Server Actions live in `_actions/` colocated with pages, prefixed with `"use server"`.
- Client Components live in `_components/` and start with `"use client"`.
- New ports/use cases come with unit tests using mocked dependencies.
- New repositories come with integration tests against Supabase via `pnpm test:it`.

## Risks and notes

- **Schema width.** `debts` table is wide (kind-specific columns nullable). Considered: split per-kind tables. Rejected for v0.1 because it complicates list queries and the domain entity is already a discriminated union; aligning storage to the union shape is cleaner. Revisit if column count grows beyond 30.
- **Rate text storage.** Storing rates as `text` avoids any PG numeric precision drift. Mapper converts to `number` (and then to `InterestRate` VO). The repository tests assert round-trip equality within `1e-9` tolerance.
- **`installment_purchases` as JSONB.** Future evolution: when we need to query "all installment purchases due in month X" or similar, this becomes a separate table. v0.1 only needs serialize-on-write, deserialize-on-read.
- **Amortization render for long schedules.** 360-month schedule is heavy. UI paginates to first 12 + last 6 by default with "Ver todas" toggle. Detail page is Server-Rendered so initial payload is the full list; pagination is client-side display only.
- **Pagamento auto-fill.** "Auto-preencher próxima parcela" uses the position in the schedule + count of recorded payments. Not perfect (real-world parcelas drift due to taxas variáveis), but covers 90% of cases.
- **Currency mask.** v0.1 uses a simple hand-rolled formatter. Consider `react-number-format` later if we hit edge cases (paste, copy, IME, etc.).
- **Form complexity.** Each kind has 6-12 fields. Wizard step pagination (one decision per screen) deferred to a polish pass to keep v0.1 focused.
