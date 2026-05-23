"use server";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import type {
  DebtKind,
  DebtStatus,
  RecurringFrequency,
} from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

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

  const r = await listDebts({ debts: new DrizzleDebtRepository() }, { userId: user.id, status });
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
