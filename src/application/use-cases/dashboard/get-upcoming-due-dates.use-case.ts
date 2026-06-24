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
      const elapsed = monthDiff(debt.startDate, now);
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
      // Vencimento no dia escolhido (`dueDay`); sem dia definido, cai pro dia
      // de `startDate`. Mesma regra do cartão pra o lembrete bater no dia certo.
      const day = debt.dueDay ?? debt.startDate.getDate();
      const due = new Date(now.getFullYear(), now.getMonth(), day);
      if (due < now) due.setMonth(due.getMonth() + 1);
      return {
        debtId: debt.id,
        label: debt.label,
        dueDate: due,
        amount: debt.monthlyInstallment,
      };
    }
    case "credit_card": {
      const due = new Date(now.getFullYear(), now.getMonth(), debt.dueDay);
      if (due < now) due.setMonth(due.getMonth() + 1);
      return {
        debtId: debt.id,
        label: debt.label,
        dueDate: due,
        amount: debt.currentStatement,
      };
    }
    case "overdraft":
      return null;
    case "recurring": {
      if (debt.recurringFrequency !== "monthly") return null;
      const day = debt.dueDay ?? debt.startDate.getDate();
      const y = now.getFullYear();
      const m = now.getMonth();
      const clampedDay = Math.min(day, new Date(y, m + 1, 0).getDate());
      const due = new Date(y, m, clampedDay);
      if (due < now) due.setMonth(due.getMonth() + 1);
      return {
        debtId: debt.id,
        label: debt.label,
        dueDate: due,
        amount: Money.fromCents(debt.recurringAmountCents),
      };
    }
  }
}

function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
