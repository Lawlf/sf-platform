import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors/result";

export interface UpcomingDue {
  debtId: string;
  label: string;
  dueDate: Date;
  amount: Money | null;
}

export interface GetUpcomingDuesDeps {
  debts: DebtRepositoryPort;
  clock: Clock;
}

export async function getUpcomingDueDates(
  deps: GetUpcomingDuesDeps,
  input: { userId: string; profileId: string; horizonDays?: number },
): Promise<Result<UpcomingDue[], never>> {
  const horizon = input.horizonDays ?? 30;
  const debts = await deps.debts.listForProfile(input.profileId, { status: "active" });
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

export function nextDueFor(debt: DebtEntity, now: Date): UpcomingDue | null {
  switch (debt.kind) {
    case "financing": {
      const elapsed = Math.max(0, monthDiff(debt.startDate, now));
      const next = new Date(debt.startDate);
      next.setMonth(debt.startDate.getMonth() + elapsed + 1);
      return {
        debtId: debt.id,
        label: debt.label,
        dueDate: next,
        amount: null,
      };
    }
    case "personal_loan": {
      // Consignado é descontado direto na folha: nunca gera lembrete de
      // vencimento manual.
      if (debt.payrollDeducted) return null;
      // Vencimento no dia escolhido (`dueDay`); sem dia definido, cai pro dia
      // de `startDate`. Mesma regra do cartão pra o lembrete bater no dia certo.
      const day = debt.dueDay ?? debt.startDate.getDate();
      return {
        debtId: debt.id,
        label: debt.label,
        dueDate: rollMonthlyDue(day, now, debt.startDate),
        amount: debt.monthlyInstallment,
      };
    }
    case "credit_card": {
      return {
        debtId: debt.id,
        label: debt.label,
        dueDate: rollMonthlyDue(debt.dueDay, now, debt.startDate),
        amount: debt.currentStatement,
      };
    }
    case "overdraft":
      return null;
    case "recurring": {
      if (debt.recurringFrequency !== "monthly") return null;
      const day = debt.dueDay ?? debt.startDate.getDate();
      return {
        debtId: debt.id,
        label: debt.label,
        dueDate: rollMonthlyDue(day, now, debt.startDate),
        amount: Money.fromCents(debt.recurringAmountCents),
      };
    }
  }
}

function rollMonthlyDue(day: number, now: Date, startDate: Date): Date {
  const start = startOfDay(startDate);
  const year = now.getFullYear();
  let month = now.getMonth();
  const inMonth = () => new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
  let due = inMonth();
  while (due < now || due < start) {
    month += 1;
    due = inMonth();
  }
  return due;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
