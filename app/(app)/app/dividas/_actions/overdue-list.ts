import { getOverdueDebts } from "@/application/use-cases/debt/get-overdue-debts.use-case";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

export interface OverduePayload {
  debtId: string;
  label: string;
  dueDay: number;
  cycleIso: string;
  amountFormatted: string | null;
  canAdjust: boolean;
}

export async function fetchOverdueDues(): Promise<OverduePayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const profileId = await getActiveProfileId();
  const result = await getOverdueDebts(
    {
      debts: repos.debts,
      acknowledgements: repos.debtDueAcknowledgements,
      payments: repos.debtPayments,
      clock,
    },
    { userId: user.id, profileId },
  );
  if (!isOk(result)) return [];

  return result.value.map((item) => ({
    debtId: item.debtId,
    label: item.label,
    dueDay: item.dueDate.getDate(),
    cycleIso: item.cycleIso,
    amountFormatted: item.amount ? item.amount.format() : null,
    canAdjust: item.kind === "credit_card" || item.kind === "personal_loan",
  }));
}
