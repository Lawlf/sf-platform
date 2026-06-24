import { getOverdueDebts } from "@/application/use-cases/debt/get-overdue-debts.use-case";
import { clock, repos } from "@/infrastructure/container";
import { isOk } from "@/shared/errors/result";

export interface OverdueState {
  dueDay: number;
  cycleIso: string;
}

export async function fetchOverdueStateForDebt(
  debtId: string,
  userId: string,
  profileId: string,
): Promise<OverdueState | null> {
  const result = await getOverdueDebts(
    { debts: repos.debts, acknowledgements: repos.debtDueAcknowledgements, clock },
    { userId, profileId },
  );
  if (!isOk(result)) return null;

  const item = result.value.find((i) => i.debtId === debtId);
  if (!item) return null;

  return { dueDay: item.dueDate.getDate(), cycleIso: item.cycleIso };
}
