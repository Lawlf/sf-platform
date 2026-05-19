# Dashboard + Simuladores Implementation Plan (Plan 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar `/app` (dashboard) útil + entregar os 3 simuladores principais (projeção de quitação, pagar extra, snowball vs avalanche). Reusa todo o Domain Core de Plan 3 (FinancialHealthService, DebtPayoffProjectorService, PayoffStrategyService). Snapshot do dashboard computado on-the-fly a partir das dívidas + renda ativas (sem persistir histórico ainda).

**Architecture:** Application use cases para consumo no UI. Wrapper de Plan 3 services em casos de uso (`projectDebtPayoff`, `simulateExtraPayment`, `comparePayoffStrategies`, `getDashboardSnapshot`). Server Components consomem use cases via Drizzle repos já criados em Plan 4. Histórico de timeline e tabela `financial_snapshots` ficam para Plan 5.5+ (depende de cron infra; sem histórico ainda, timeline mostra placeholder).

**Tech Stack:** Existing. Adds: Recharts (timeline + line chart) instalado on-demand quando primeiro chart precisar.

---

## File Structure

```
src/
  application/
    use-cases/
      dashboard/
        get-dashboard-snapshot.use-case.ts + test    # current snapshot inline
        get-upcoming-due-dates.use-case.ts + test    # next 30 days
      simulation/
        project-debt-payoff.use-case.ts + test       # wraps Plan 3 DebtPayoffProjectorService
        simulate-extra-payment.use-case.ts + test    # compares baseline vs extra
        compare-payoff-strategies.use-case.ts + test # wraps Plan 3 PayoffStrategyService

app/
  (app)/
    app/
      page.tsx                                      # MODIFY: replace placeholder with real dashboard
      _components/
        dashboard-cards.tsx                          # status cards horizontal scroll
        timeline-placeholder.tsx                     # histórico em construção (real chart in Plan 5.5)
        upcoming-dues.tsx                            # próximos vencimentos list
      simular/
        page.tsx                                     # hub: 3 cards linking to sub-routes
        quitacao/
          page.tsx                                   # picker + projection
          _components/
            payoff-form.tsx
            payoff-result.tsx
          _actions/
            run-payoff.action.ts
        extra/
          page.tsx                                   # picker + extra payment slider/input + comparison
          _components/
            extra-form.tsx
            extra-result.tsx
          _actions/
            run-extra.action.ts
        estrategia/
          page.tsx                                   # multi-select debts + budget + comparison
          _components/
            strategy-form.tsx
            strategy-result.tsx
          _actions/
            run-strategy.action.ts
```

---

## Conventions

- **Working directory:** `/Users/fernandes/Projects/sabor-financeiro/sf-platform`.
- **No git commits.**
- **No em-dash, no emoji.** Portuguese accents required where natural.
- **TDD for use cases.** UI tested via Playwright in T15 of Plan 4 (existing). Sim routes get auth-gate smoke later.
- **Re-uses Plan 3 services**; do not duplicate math.
- **Snapshot is computed inline; no DB writes for timeline yet.**

---

## Task 1: Dashboard snapshot use case

**Files:**
- Create: `src/application/use-cases/dashboard/get-dashboard-snapshot.use-case.ts` + test
- Create: `src/application/use-cases/dashboard/get-upcoming-due-dates.use-case.ts` + test

### `get-dashboard-snapshot.use-case.ts`

Wraps `FinancialHealthService.snapshot()` from Plan 3. Loads active debts + incomes for the user, calls service, returns the snapshot entity.

```ts
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import type { FinancialSnapshotEntity } from "@/domain/entities/financial-snapshot.entity";
import type { Clock } from "@/domain/ports/clock.port";
import { FinancialHealthService } from "@/domain/services/financial-health.service";
import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import { err, isOk, ok, type Result } from "@/shared/errors";

export interface GetDashboardSnapshotDeps {
  debts: DebtRepository;
  incomes: IncomeRepository;
  clock: Clock;
}

export async function getDashboardSnapshot(
  deps: GetDashboardSnapshotDeps,
  input: { userId: string },
): Promise<Result<FinancialSnapshotEntity, InvalidAmortizationParamsError>> {
  const debts = await deps.debts.listForUser(input.userId, { status: "active" });
  const incomes = await deps.incomes.listForUser(input.userId, { onlyActive: true });
  const now = deps.clock.now();
  const r = FinancialHealthService.snapshot({
    userId: input.userId,
    incomes,
    debts,
    asOfDate: now,
  });
  if (!isOk(r)) return err(r.error);
  return ok(r.value);
}
```

Test (3 cases): user with debts + incomes, empty user, error propagation.

### `get-upcoming-due-dates.use-case.ts`

Returns next 30 days of due payments per debt kind:
- financing/personal_loan: next installment month + estimated date
- credit_card: next `dueDay` of the current/next month
- overdraft: no fixed due; skip

```ts
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { Money } from "@/domain/value-objects/money.vo";
import type { Clock } from "@/domain/ports/clock.port";
import { ok, type Result } from "@/shared/errors";

export interface UpcomingDue {
  debtId: string;
  label: string;
  dueDate: Date;
  amount: Money | null;
}

export interface GetUpcomingDuesDeps {
  debts: DebtRepository;
  clock: Clock;
}

export async function getUpcomingDueDates(
  deps: GetUpcomingDuesDeps,
  input: { userId: string; horizonDays?: number },
): Promise<Result<UpcomingDue[], never>> {
  const horizon = input.horizonDays ?? 30;
  const debts = await deps.debts.listForUser(input.userId, { status: "active" });
  const now = deps.clock.now();
  const cutoff = new Date(now.getTime() + horizon * 24 * 60 * 60 * 1000);
  const dues: UpcomingDue[] = [];

  for (const debt of debts) {
    const due = nextDueFor(debt, now);
    if (due && due.dueDate <= cutoff) dues.push(due);
  }
  dues.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return ok(dues);
}

function nextDueFor(debt: DebtEntity, now: Date): UpcomingDue | null {
  switch (debt.kind) {
    case "financing":
    case "personal_loan": {
      // Approximate: due date = start date + N months where N = elapsed months + 1
      const elapsed = monthDiff(debt.startDate, now);
      const next = new Date(debt.startDate);
      next.setMonth(debt.startDate.getMonth() + elapsed + 1);
      return {
        debtId: debt.id,
        label: debt.label,
        dueDate: next,
        amount: debt.kind === "personal_loan" ? debt.monthlyInstallment : null,
      };
    }
    case "credit_card": {
      const due = new Date(now.getFullYear(), now.getMonth(), debt.dueDay);
      if (due < now) due.setMonth(due.getMonth() + 1);
      return { debtId: debt.id, label: debt.label, dueDate: due, amount: debt.currentStatement };
    }
    case "overdraft":
      return null;
  }
}

function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
```

Test (4): financing -> next installment date; credit_card with due_day in past month rolls; overdraft returns null; sorting by date.

### Suggested commit

```
feat(application/dashboard): add get-dashboard-snapshot and get-upcoming-due-dates use cases
```

---

## Task 2: Simulation use cases

**Files:**
- Create: `src/application/use-cases/simulation/project-debt-payoff.use-case.ts` + test
- Create: `src/application/use-cases/simulation/simulate-extra-payment.use-case.ts` + test
- Create: `src/application/use-cases/simulation/compare-payoff-strategies.use-case.ts` + test

### `project-debt-payoff.use-case.ts`

Loads debt by id (ownership check) + invokes `DebtPayoffProjectorService` from Plan 3.

```ts
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { Money } from "@/domain/value-objects/money.vo";
import type { Clock } from "@/domain/ports/clock.port";
import { DebtPayoffProjectorService, type DebtPayoffProjection } from "@/domain/services/debt-payoff-projector.service";
import { DebtNotFound, InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import { Forbidden } from "@/domain/errors";
import { err, isOk, ok, type Result } from "@/shared/errors";

export interface ProjectDebtPayoffDeps {
  debts: DebtRepository;
  clock: Clock;
}

export interface ProjectDebtPayoffInput {
  userId: string;
  debtId: string;
  monthlyPayment: Money;
  extraPayment?: Money;
}

export async function projectDebtPayoff(
  deps: ProjectDebtPayoffDeps,
  input: ProjectDebtPayoffInput,
): Promise<Result<DebtPayoffProjection, DebtNotFound | Forbidden | InvalidAmortizationParamsError>> {
  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new DebtNotFound("Divida nao encontrada."));
  if (debt.userId !== input.userId) return err(new Forbidden("Acesso negado."));

  const r = DebtPayoffProjectorService.project({
    debt,
    monthlyPayment: input.monthlyPayment,
    extraPayment: input.extraPayment,
    startingFrom: deps.clock.now(),
    maxMonths: 600,
  });
  if (!isOk(r)) return err(r.error);
  return ok(r.value);
}
```

Test (3): happy path, not-found, forbidden.

### `simulate-extra-payment.use-case.ts`

Runs the projector twice (baseline + with extra) and returns the comparison:

```ts
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { Money } from "@/domain/value-objects/money.vo";
import type { Clock } from "@/domain/ports/clock.port";
import { DebtPayoffProjectorService } from "@/domain/services/debt-payoff-projector.service";
import { DebtNotFound, InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import { Forbidden } from "@/domain/errors";
import { err, isOk, ok, type Result } from "@/shared/errors";

export interface SimulateExtraPaymentDeps {
  debts: DebtRepository;
  clock: Clock;
}

export interface SimulateExtraPaymentInput {
  userId: string;
  debtId: string;
  monthlyPayment: Money;       // baseline parcela
  extraPayment: Money;         // extra para comparar
}

export interface ExtraPaymentComparison {
  baseline: { payoffMonth: number | null; totalInterest: Money; totalPaid: Money };
  withExtra: { payoffMonth: number | null; totalInterest: Money; totalPaid: Money };
  monthsSaved: number;
  interestSaved: Money;
}

export async function simulateExtraPayment(
  deps: SimulateExtraPaymentDeps,
  input: SimulateExtraPaymentInput,
): Promise<Result<ExtraPaymentComparison, DebtNotFound | Forbidden | InvalidAmortizationParamsError>> {
  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new DebtNotFound("Divida nao encontrada."));
  if (debt.userId !== input.userId) return err(new Forbidden("Acesso negado."));

  const baseline = DebtPayoffProjectorService.project({
    debt, monthlyPayment: input.monthlyPayment, startingFrom: deps.clock.now(), maxMonths: 600,
  });
  if (!isOk(baseline)) return err(baseline.error);
  const withExtra = DebtPayoffProjectorService.project({
    debt, monthlyPayment: input.monthlyPayment, extraPayment: input.extraPayment, startingFrom: deps.clock.now(), maxMonths: 600,
  });
  if (!isOk(withExtra)) return err(withExtra.error);

  const monthsSaved = (baseline.value.payoffMonth ?? 600) - (withExtra.value.payoffMonth ?? 600);
  const interestSaved = baseline.value.totalInterest.subtract(withExtra.value.totalInterest);

  return ok({
    baseline: {
      payoffMonth: baseline.value.payoffMonth,
      totalInterest: baseline.value.totalInterest,
      totalPaid: baseline.value.totalPaid,
    },
    withExtra: {
      payoffMonth: withExtra.value.payoffMonth,
      totalInterest: withExtra.value.totalInterest,
      totalPaid: withExtra.value.totalPaid,
    },
    monthsSaved,
    interestSaved,
  });
}
```

Test (3): zero extra returns identical baseline; positive extra reduces months; not-found.

### `compare-payoff-strategies.use-case.ts`

Loads selected debts + invokes `PayoffStrategyService.compare`:

```ts
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { Money } from "@/domain/value-objects/money.vo";
import type { Clock } from "@/domain/ports/clock.port";
import { PayoffStrategyService, type PayoffComparison } from "@/domain/services/payoff-strategy.service";
import { Forbidden } from "@/domain/errors";
import { DebtNotFound, InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import { err, isOk, ok, type Result } from "@/shared/errors";

export interface ComparePayoffStrategiesDeps {
  debts: DebtRepository;
  clock: Clock;
}

export interface ComparePayoffStrategiesInput {
  userId: string;
  debtIds: string[];           // empty -> compare ALL active debts
  monthlyBudget: Money;
}

export async function comparePayoffStrategies(
  deps: ComparePayoffStrategiesDeps,
  input: ComparePayoffStrategiesInput,
): Promise<Result<PayoffComparison, DebtNotFound | Forbidden | InvalidAmortizationParamsError>> {
  const allActive = await deps.debts.listForUser(input.userId, { status: "active" });
  let selected = allActive;
  if (input.debtIds.length > 0) {
    selected = allActive.filter((d) => input.debtIds.includes(d.id));
    if (selected.length !== input.debtIds.length) {
      // some requested IDs missing or not owned
      return err(new Forbidden("Divida invalida na selecao."));
    }
  }
  if (selected.length === 0) {
    return err(new InvalidAmortizationParamsError("Selecione ao menos uma divida ativa."));
  }
  const r = PayoffStrategyService.compare({
    debts: selected,
    monthlyBudget: input.monthlyBudget,
    startingFrom: deps.clock.now(),
    maxMonths: 600,
  });
  if (!isOk(r)) return err(r.error);
  return ok(r.value);
}
```

Test (4): all active default, explicit debt selection, invalid selection (Forbidden), empty active (Err).

### Suggested commits

```
feat(application/simulation): add projectDebtPayoff use case
feat(application/simulation): add simulateExtraPayment with baseline comparison
feat(application/simulation): add comparePayoffStrategies use case
```

---

## Task 3: Dashboard page

**Files:**
- Modify: `app/(app)/app/page.tsx` (replace placeholder)
- Create: `app/(app)/app/_components/dashboard-cards.tsx`
- Create: `app/(app)/app/_components/timeline-placeholder.tsx`
- Create: `app/(app)/app/_components/upcoming-dues.tsx`

### `page.tsx`

```tsx
import Link from "next/link";

import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { getUpcomingDueDates } from "@/application/use-cases/dashboard/get-upcoming-due-dates.use-case";
import { Button } from "@/app/components/ui/button";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isOk } from "@/shared/errors";

import { PageShell } from "./_components/page-shell";
import { DashboardCards } from "./_components/dashboard-cards";
import { TimelinePlaceholder } from "./_components/timeline-placeholder";
import { UpcomingDues } from "./_components/upcoming-dues";

export default async function DashboardPage() {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  const debtRepo = new DrizzleDebtRepository();
  const clock = new SystemClock();

  const snapshotR = await getDashboardSnapshot(
    { debts: debtRepo, incomes: new DrizzleIncomeRepository(), clock },
    { userId: user.id },
  );
  const upcomingR = await getUpcomingDueDates(
    { debts: debtRepo, clock },
    { userId: user.id, horizonDays: 30 },
  );

  const snapshot = isOk(snapshotR) ? snapshotR.value : null;
  const upcoming = isOk(upcomingR) ? upcomingR.value : [];

  return (
    <PageShell title={`Olá, ${user.displayName ?? "bem-vindo"}`} description={greetingFor(snapshot)}>
      {snapshot ? <DashboardCards snapshot={snapshot} /> : <p className="text-sm opacity-70">Cadastre renda e dívidas para ver seu painel.</p>}

      <section className="glass-light p-4">
        <h2 className="mb-2 text-sm font-semibold opacity-80">Linha do tempo</h2>
        <TimelinePlaceholder />
      </section>

      <section className="glass-light p-4">
        <h2 className="mb-2 text-sm font-semibold opacity-80">Próximos vencimentos (30 dias)</h2>
        <UpcomingDues items={upcoming.map((d) => ({
          ...d,
          dueDate: d.dueDate.toISOString(),
          amountFormatted: d.amount?.format() ?? null,
        }))} />
      </section>

      <Button asChild>
        <Link href="/app/simular">Simular cenário</Link>
      </Button>
    </PageShell>
  );
}

function greetingFor(snapshot: import("@/domain/entities/financial-snapshot.entity").FinancialSnapshotEntity | null): string {
  if (!snapshot) return "Comece cadastrando suas fontes de renda e dívidas.";
  if (snapshot.incomeCommittedPct > 1) return "Atenção: seu comprometimento de renda passou de 100%.";
  if (snapshot.incomeCommittedPct > 0.4) return "Atenção: comprometimento alto, considere simular cenários.";
  if (snapshot.totalDebtBalance.isZero()) return "Você está sem dívidas. Bom trabalho.";
  return "Você está no caminho. Continue acompanhando seu progresso.";
}
```

### `dashboard-cards.tsx`

Horizontal scroll on mobile. Each card shows one metric.

```tsx
import type { FinancialSnapshotEntity } from "@/domain/entities/financial-snapshot.entity";

const PCT_FMT = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 1 });

export function DashboardCards({ snapshot }: { snapshot: FinancialSnapshotEntity }) {
  return (
    <section className="flex gap-2 overflow-x-auto -mx-2 px-2 pb-2 snap-x">
      <Card title="Renda mensal" value={snapshot.totalIncome.format()} />
      <Card title="Dívida total" value={snapshot.totalDebtBalance.format()} tone={snapshot.totalDebtBalance.isPositive() ? "negative" : "neutral"} />
      <Card title="% renda comprometida" value={Number.isFinite(snapshot.incomeCommittedPct) ? PCT_FMT.format(snapshot.incomeCommittedPct) : "-"} tone={snapshot.incomeCommittedPct > 0.4 ? "negative" : "neutral"} />
      <Card title="CET médio (a.a.)" value={snapshot.cetWeightedAverage.toAnnual().format()} />
      <Card title="Saldo líquido mensal" value={snapshot.netWorth.format()} tone={snapshot.netWorth.isPositive() ? "positive" : "negative"} />
    </section>
  );
}

function Card({ title, value, tone = "neutral" }: { title: string; value: string; tone?: "positive" | "negative" | "neutral" }) {
  const colorClass = tone === "positive" ? "text-[color:var(--color-positive)]" : tone === "negative" ? "text-[color:var(--color-negative)]" : "";
  return (
    <article className="glass-light flex min-w-[180px] snap-start flex-col gap-1 p-4">
      <p className="text-xs opacity-70">{title}</p>
      <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
    </article>
  );
}
```

Note: replace `-` em-dash placeholder with `"-"` (ASCII hyphen) to comply with no-em-dash rule.

### `timeline-placeholder.tsx`

```tsx
export function TimelinePlaceholder() {
  return (
    <p className="text-sm opacity-70">
      Em construção. Histórico de patrimônio líquido aparece aqui após algumas semanas de uso.
    </p>
  );
}
```

### `upcoming-dues.tsx`

```tsx
const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function UpcomingDues({ items }: { items: { debtId: string; label: string; dueDate: string; amountFormatted: string | null }[] }) {
  if (items.length === 0) {
    return <p className="text-sm opacity-70">Sem vencimentos previstos.</p>;
  }
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {items.map((d) => (
        <li key={`${d.debtId}-${d.dueDate}`} className="flex items-center justify-between">
          <span>{d.label}</span>
          <span className="opacity-80">
            {DATE_FMT.format(new Date(d.dueDate))}
            {d.amountFormatted ? ` - ${d.amountFormatted}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

### Suggested commit

```
feat(ui/dashboard): wire /app dashboard with cards, timeline placeholder, upcoming dues
```

---

## Task 4: Simulator hub

**Files:**
- Create: `app/(app)/app/simular/page.tsx`

Just 3 link cards.

```tsx
import Link from "next/link";

import { PageShell } from "../_components/page-shell";

const SIMULATORS = [
  { href: "/app/simular/quitacao", title: "Projeção de quitação", desc: "Quando uma dívida termina?" },
  { href: "/app/simular/extra", title: "Pagar extra", desc: "Quanto economizo pagando mais?" },
  { href: "/app/simular/estrategia", title: "Snowball vs Avalanche", desc: "Qual ordem rende mais?" },
] as const;

export default function SimularHubPage() {
  return (
    <PageShell title="Simular" description="Compare cenários e estratégias.">
      <div className="flex flex-col gap-3">
        {SIMULATORS.map((s) => (
          <Link key={s.href} href={s.href as import("next").Route} className="glass-light flex flex-col gap-1 p-4 transition-colors hover:bg-white/70">
            <span className="text-sm font-semibold text-[color:var(--color-brand-800)]">{s.title}</span>
            <span className="text-xs opacity-70">{s.desc}</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
```

### Suggested commit

```
feat(ui/simular): add simulator hub linking to 3 sub-routes
```

---

## Task 5: Simulador de quitação `/app/simular/quitacao`

**Files:**
- Create: `app/(app)/app/simular/quitacao/page.tsx`
- Create: `_components/payoff-form.tsx`
- Create: `_components/payoff-result.tsx`
- Create: `_actions/run-payoff.action.ts`

### Page

Loads active debts, renders a `<PayoffForm debts={...} />` Client Component with a `<select>` to pick debt + `MoneyInput` for monthly payment + optional extra. On submit, server action returns the projection. Renders `<PayoffResult />` below the form.

### Action

```ts
"use server";

import { z } from "zod";

import { projectDebtPayoff } from "@/application/use-cases/simulation/project-debt-payoff.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isErr } from "@/shared/errors";

const schema = z.object({
  debtId: z.string().uuid(),
  monthlyPaymentCents: z.coerce.bigint().positive(),
  extraPaymentCents: z.coerce.bigint().nonnegative().optional(),
});

export interface PayoffActionResult {
  ok: true;
  payoffMonth: number | null;
  payoffDate: string | null;
  totalPaid: string;
  totalInterest: string;
  negativeAmortization: boolean;
}

export async function runPayoffAction(formData: FormData): Promise<PayoffActionResult | { ok: false; message: string }> {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };

  const r = await projectDebtPayoff(
    { debts: new DrizzleDebtRepository(), clock: new SystemClock() },
    {
      userId: user.id,
      debtId: parsed.data.debtId,
      monthlyPayment: Money.fromCents(parsed.data.monthlyPaymentCents),
      extraPayment: parsed.data.extraPaymentCents !== undefined ? Money.fromCents(parsed.data.extraPaymentCents) : undefined,
    },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };

  return {
    ok: true,
    payoffMonth: r.value.payoffMonth,
    payoffDate: r.value.payoffDate?.toISOString() ?? null,
    totalPaid: r.value.totalPaid.format(),
    totalInterest: r.value.totalInterest.format(),
    negativeAmortization: r.value.negativeAmortization,
  };
}
```

### Form + Result

Form is Client Component with controlled debt select, `MoneyInput` x 2, submit, and state for the action result (`useState`). When action returns ok, render `<PayoffResult ...>`.

### Suggested commit

```
feat(ui/simular): add quitação simulator with debt picker and projection display
```

---

## Task 6: Simulador de pagamento extra `/app/simular/extra`

**Files:**
- Create: `app/(app)/app/simular/extra/page.tsx` + `_components/extra-form.tsx` + `_components/extra-result.tsx` + `_actions/run-extra.action.ts`

Same pattern as Task 5. The action wraps `simulateExtraPayment` use case. Result shows:

- Sem extra: parcela X, payoff em Y meses, total juros Z
- Com extra R$ N: payoff em (Y - savedMonths) meses, total juros (Z - interestSaved)
- "Você economiza N meses e R$ X em juros."

### Suggested commit

```
feat(ui/simular): add pagar-extra simulator with baseline vs extra comparison
```

---

## Task 7: Simulador snowball vs avalanche `/app/simular/estrategia`

**Files:**
- Create: `app/(app)/app/simular/estrategia/page.tsx` + `_components/strategy-form.tsx` + `_components/strategy-result.tsx` + `_actions/run-strategy.action.ts`

### Form

Multi-select de dívidas (checkboxes) + budget mensal (`MoneyInput`). Submit chama `comparePayoffStrategies`.

### Result

Two columns side-by-side (or stacked on mobile):

- **Snowball**: order list (debt labels), months to freedom, total paid, total interest.
- **Avalanche**: same.
- Footer: "Avalanche poupa R$ X em juros vs snowball" (use case já entrega ambos; calcule a diferença na UI).

### Suggested commit

```
feat(ui/simular): add snowball-vs-avalanche strategy comparison
```

---

## Task 8: E2E auth gate smoke for simulator routes

**Files:**
- Modify: `tests-e2e/smoke.spec.ts`

Append:

```ts
test("auth gate redirects /app/simular to /entrar", async ({ page }) => {
  await page.goto("/app/simular");
  await expect(page).toHaveURL(/\/entrar/);
});

test("auth gate redirects /app/simular/quitacao to /entrar", async ({ page }) => {
  await page.goto("/app/simular/quitacao");
  await expect(page).toHaveURL(/\/entrar/);
});
```

Verify all gates:

```bash
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform format:check
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform lint
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform typecheck
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform test
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform test:it
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform build
pnpm -C /Users/fernandes/Projects/sabor-financeiro/sf-platform test:e2e
```

All exit 0.

### Suggested commit

```
chore(test): add e2e auth-gate smoke for simulator routes
```

---

## Hard constraints

- Working dir: `/Users/fernandes/Projects/sabor-financeiro/sf-platform`.
- No git commits.
- No em-dash (U+2014), no emoji. Portuguese accents fine.
- Domain layer untouched (we just consume Plan 3 services in new application use cases).
- Use cases pure orchestration; tests with mocked ports.
- Server Actions in `_actions/`, Client Components in `_components/`.
- Use `as Route` casts when typed routes complain.

## Roadmap of suggested commits

1. `feat(application/dashboard): add get-dashboard-snapshot and get-upcoming-due-dates use cases`
2. `feat(application/simulation): add projectDebtPayoff, simulateExtraPayment, comparePayoffStrategies use cases`
3. `feat(ui/dashboard): wire /app dashboard with cards, timeline placeholder, upcoming dues`
4. `feat(ui/simular): add simulator hub`
5. `feat(ui/simular): add quitacao simulator`
6. `feat(ui/simular): add pagar-extra simulator`
7. `feat(ui/simular): add snowball-vs-avalanche strategy comparison`
8. `chore(test): add e2e auth-gate smoke for simulator routes`

## Risks and notes

- **Timeline em-dash placeholder.** Use ASCII `"-"` not `"-"`. Several other UI strings need the same care.
- **Snapshot computation cost.** For users with many debts, computing the snapshot on every dashboard load may be slow (~ms per debt for amortization regen). Cache once per request via React `cache()` if perf becomes an issue. v0.1 acceptable as-is.
- **Multi-debt strategy form.** Showing 10+ debts in a checklist on mobile can be cramped. v0.1 lists all active; v0.2 add search/filter if needed.
- **No real timeline yet.** Plan 5.5 (separate plan, after Plan 6) will add the `financial_snapshots` table + cron + actual chart with Recharts.
