import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";

import { addMonthsClamped } from "./debt-calendar.service";

export interface GoalEtaInput {
  goalId: string;
  title: string;
  /** Offset 1-based a partir do mês corrente. 0 = já concluída, null = sem caixa. */
  etaMonth: number | null;
}

export type ForwardMilestoneGroup = "fact" | "projection";

export type ForwardMilestoneKind =
  | "debt_payoff"
  | "recurring_end"
  | "scheduled_charge"
  | "goal_complete";

export interface ForwardMilestone {
  id: string;
  group: ForwardMilestoneGroup;
  kind: ForwardMilestoneKind;
  entityLabel: string;
  monthIso: string;
  href: string;
}

export interface ForwardMilestonesInput {
  now: Date;
  debts: DebtEntity[];
  transactions: TransactionEntity[];
  goals: GoalEtaInput[];
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

  const facts: ForwardMilestone[] = [];

  for (const debt of input.debts) {
    if (debt.status !== "active" || debt.deletedAt !== null) continue;

    if (debt.kind === "financing" || debt.kind === "personal_loan") {
      const iso = monthIsoOf(addMonthsClamped(debt.startDate, debt.termMonths - 1));
      if (inWindow(iso)) {
        facts.push({
          id: `debt_payoff:${debt.id}`,
          group: "fact",
          kind: "debt_payoff",
          entityLabel: debt.label,
          monthIso: iso,
          href: `/app/dividas/${debt.id}`,
        });
      }
    } else if (debt.kind === "recurring" && debt.expectedEndDate !== null) {
      const iso = monthIsoOf(debt.expectedEndDate);
      if (inWindow(iso)) {
        facts.push({
          id: `recurring_end:${debt.id}`,
          group: "fact",
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
      group: "fact",
      kind: "scheduled_charge",
      entityLabel: t.description,
      monthIso: iso,
      href: "/app/lancamentos",
    }));
  facts.push(...scheduled);

  if (facts.length === 0) return [];

  const projections: ForwardMilestone[] = [];
  for (const g of input.goals) {
    if (g.etaMonth === null || g.etaMonth < 1) continue;
    const iso = monthIsoOf(addMonthsClamped(input.now, g.etaMonth));
    if (inWindow(iso)) {
      projections.push({
        id: `goal_complete:${g.goalId}`,
        group: "projection",
        kind: "goal_complete",
        entityLabel: g.title,
        monthIso: iso,
        href: `/app/metas/${g.goalId}`,
      });
    }
  }

  facts.sort((a, b) => a.monthIso.localeCompare(b.monthIso));
  projections.sort((a, b) => a.monthIso.localeCompare(b.monthIso));
  return [...facts, ...projections];
}
