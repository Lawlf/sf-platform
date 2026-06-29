import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";

import { addMonthsClamped } from "./debt-calendar.service";

export type ForwardMilestoneKind = "debt_payoff" | "recurring_end" | "scheduled_charge";

export interface ForwardMilestone {
  id: string;
  kind: ForwardMilestoneKind;
  entityLabel: string;
  monthIso: string;
  href: string;
}

export interface ForwardMilestonesInput {
  now: Date;
  debts: DebtEntity[];
  transactions: TransactionEntity[];
  windowMonths?: number;
  scheduledCap?: number;
}

function monthIsoOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildForwardMilestones(input: ForwardMilestonesInput): ForwardMilestone[] {
  const windowMonths = input.windowMonths ?? 24;
  const scheduledCap = input.scheduledCap ?? 3;
  const currentIso = monthIsoOf(input.now);
  const maxIso = monthIsoOf(addMonthsClamped(input.now, windowMonths));
  const inWindow = (iso: string): boolean => iso > currentIso && iso <= maxIso;

  const milestones: ForwardMilestone[] = [];

  for (const debt of input.debts) {
    if (debt.status !== "active" || debt.deletedAt !== null) continue;

    if (debt.kind === "financing" || debt.kind === "personal_loan") {
      const iso = monthIsoOf(addMonthsClamped(debt.startDate, debt.termMonths - 1));
      if (inWindow(iso)) {
        milestones.push({
          id: `debt_payoff:${debt.id}`,
          kind: "debt_payoff",
          entityLabel: debt.label,
          monthIso: iso,
          href: `/app/dividas/${debt.id}`,
        });
      }
    } else if (debt.kind === "recurring" && debt.expectedEndDate !== null) {
      const iso = monthIsoOf(debt.expectedEndDate);
      if (inWindow(iso)) {
        milestones.push({
          id: `recurring_end:${debt.id}`,
          kind: "recurring_end",
          entityLabel: debt.label,
          monthIso: iso,
          href: `/app/dividas/${debt.id}`,
        });
      }
    }
  }

  const scheduled = input.transactions
    .filter(
      (t) =>
        t.direction === "out" &&
        t.status === "scheduled" &&
        !t.excludedFromTotals &&
        t.deletedAt === null,
    )
    .map((t) => ({ t, iso: monthIsoOf(t.occurredAt) }))
    .filter(({ iso }) => inWindow(iso))
    .sort((a, b) => a.iso.localeCompare(b.iso))
    .slice(0, scheduledCap)
    .map<ForwardMilestone>(({ t, iso }) => ({
      id: `scheduled_charge:${t.id}`,
      kind: "scheduled_charge",
      entityLabel: t.description,
      monthIso: iso,
      href: "/app/lancamentos",
    }));
  milestones.push(...scheduled);

  milestones.sort((a, b) => a.monthIso.localeCompare(b.monthIso));
  return milestones;
}
