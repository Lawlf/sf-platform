"use server";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

import { serializeMoney, type SerializedMoney } from "../../../_actions/_serialize";

export interface ActiveDebtPayload {
  id: string;
  label: string;
  kind: string;
  currentBalance: SerializedMoney;
}

export async function listActiveDebtsForLinking(): Promise<ActiveDebtPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const r = await listDebts(
    { debts: new DrizzleDebtRepository() },
    { userId: user.id, status: "active" },
  );
  if (!isOk(r)) return [];
  return r.value.map((d) => ({
    id: d.id,
    label: d.label,
    kind: d.kind,
    currentBalance: serializeMoney(d.currentBalance),
  }));
}
