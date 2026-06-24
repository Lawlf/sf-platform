import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtDueAcknowledgementRepositoryPort } from "@/domain/ports/repositories/debt-due-acknowledgement.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors/result";

export interface OverdueItem {
  debtId: string;
  label: string;
  dueDate: Date;
  cycleIso: string;
  amount: Money | null;
}

export interface GetOverdueDebtsDeps {
  debts: DebtRepositoryPort;
  acknowledgements: DebtDueAcknowledgementRepositoryPort;
  clock: Clock;
}

export async function getOverdueDebts(
  deps: GetOverdueDebtsDeps,
  input: { userId: string; profileId: string },
): Promise<Result<OverdueItem[], never>> {
  const debts = await deps.debts.listForProfile(input.profileId, { status: "active" });
  const now = deps.clock.now();
  const today = startOfDay(now);
  const paid = new Set(
    (await deps.acknowledgements.listPaidCyclesForUser(input.userId)).map(
      (p) => `${p.debtId}:${p.cycleIso}`,
    ),
  );

  const items: OverdueItem[] = [];
  for (const debt of debts) {
    const due = currentCycleDue(debt, today);
    if (!due) continue;
    if (due.dueDate > today) continue;
    const cycleIso = isoMonth(due.dueDate);
    if (paid.has(`${debt.id}:${cycleIso}`)) continue;
    items.push({ ...due, cycleIso });
  }
  items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return ok(items);
}

function currentCycleDue(
  debt: DebtEntity,
  today: Date,
): { debtId: string; label: string; dueDate: Date; amount: Money | null } | null {
  const dueDay = monthlyDueDay(debt);
  if (dueDay === null) return null;
  const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
  return { debtId: debt.id, label: debt.label, dueDate, amount: monthlyAmount(debt) };
}

function monthlyDueDay(debt: DebtEntity): number | null {
  switch (debt.kind) {
    case "credit_card":
      return debt.dueDay;
    case "personal_loan":
      return debt.dueDay ?? debt.startDate.getDate();
    case "recurring":
      return debt.recurringFrequency === "monthly"
        ? (debt.dueDay ?? debt.startDate.getDate())
        : null;
    // financing and overdraft have no stable monthly dueDay in v1
    case "financing":
    case "overdraft":
      return null;
  }
}

function monthlyAmount(debt: DebtEntity): Money | null {
  switch (debt.kind) {
    case "credit_card":
      return debt.currentStatement;
    case "personal_loan":
      return debt.monthlyInstallment;
    case "recurring":
      return Money.fromCents(debt.recurringAmountCents);
    default:
      return null;
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
