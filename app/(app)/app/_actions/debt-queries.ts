"use server";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import type {
  DebtKind,
  DebtStatus,
  RecurringFrequency,
} from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export type DebtStatusFilter = DebtStatus | "all";

export interface DebtListItemPayload {
  id: string;
  label: string;
  kind: DebtKind;
  status: DebtStatus;
  currentBalance: SerializedMoney;
  originalPrincipal: SerializedMoney;
  recurringFrequency: RecurringFrequency | null;
  recurringAmount: SerializedMoney | null;
}

export async function fetchDebts({
  status,
}: {
  status: DebtStatusFilter;
}): Promise<DebtListItemPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const r = await listDebts({ debts: repos.debts }, { userId: user.id, status });
  const list = isOk(r) ? r.value : [];
  return list.map((d) => ({
    id: d.id,
    label: d.label,
    kind: d.kind,
    status: d.status,
    currentBalance: serializeMoney(d.currentBalance),
    originalPrincipal: serializeMoney(d.originalPrincipal),
    recurringFrequency: d.kind === "recurring" ? d.recurringFrequency : null,
    recurringAmount:
      d.kind === "recurring" ? serializeMoney(Money.fromCents(d.recurringAmountCents)) : null,
  }));
}

export interface OutOfMonthSummary {
  count: number;
  total: SerializedMoney;
}

/**
 * Resumo das dívidas "fora do seu mês" (written_off): quantas são e quanto
 * somam. Usado na home pra ancorar o fato de que elas continuam no total que
 * se deve, mesmo não pesando no comprometido.
 */
export async function fetchOutOfMonthSummary(): Promise<OutOfMonthSummary> {
  const user = await getCurrentUser();
  if (!user) return { count: 0, total: serializeMoney(Money.fromCents(0n)) };

  const r = await listDebts(
    { debts: repos.debts },
    { userId: user.id, status: "written_off" },
  );
  const list = isOk(r) ? r.value : [];
  const totalCents = list.reduce((acc, d) => acc + d.currentBalance.toCents(), 0n);
  return { count: list.length, total: serializeMoney(Money.fromCents(totalCents)) };
}
