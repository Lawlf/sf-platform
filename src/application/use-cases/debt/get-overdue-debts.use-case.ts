import type { DebtEntity, DebtKind } from "@/domain/entities/debt.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtDueAcknowledgementRepositoryPort } from "@/domain/ports/repositories/debt-due-acknowledgement.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors/result";

export interface OverdueItem {
  debtId: string;
  label: string;
  kind: DebtKind;
  dueDate: Date;
  cycleIso: string;
  amount: Money | null;
}

export interface GetOverdueDebtsDeps {
  debts: DebtRepositoryPort;
  acknowledgements: DebtDueAcknowledgementRepositoryPort;
  payments: DebtPaymentRepositoryPort;
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
    if (debt.kind !== "recurring" && (await hasPaymentInCycle(deps, debt.id, cycleIso))) continue;
    items.push({ ...due, cycleIso });
  }
  items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return ok(items);
}

async function hasPaymentInCycle(
  deps: GetOverdueDebtsDeps,
  debtId: string,
  cycleIso: string,
): Promise<boolean> {
  const payments = await deps.payments.listForDebt(debtId);
  return payments.some((p) => isoMonth(p.paidAt) === cycleIso);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function currentCycleDue(
  debt: DebtEntity,
  today: Date,
): { debtId: string; label: string; kind: DebtKind; dueDate: Date; amount: Money | null } | null {
  const dueDay = monthlyDueDay(debt);
  if (dueDay === null) return null;
  const year = today.getFullYear();
  const month = today.getMonth();
  const clampedDay = Math.min(dueDay, daysInMonth(year, month));
  const dueDate = new Date(year, month, clampedDay);
  return { debtId: debt.id, label: debt.label, kind: debt.kind, dueDate, amount: monthlyAmount(debt) };
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
