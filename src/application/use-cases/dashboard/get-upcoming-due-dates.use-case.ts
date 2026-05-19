import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { Money } from "@/domain/value-objects/money.vo";
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
      return {
        debtId: debt.id,
        label: debt.label,
        dueDate: due,
        amount: debt.currentStatement,
      };
    }
    case "overdraft":
      return null;
  }
}

function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
