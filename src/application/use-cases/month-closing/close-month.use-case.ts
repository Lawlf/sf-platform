import type { ReconciliationStatus } from "@/domain/services/reconciliation.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";

import {
  computeMonthClosing,
  type MonthClosingDeps,
} from "./preview-month-closing.use-case";

export type CloseMonthResult =
  | { ok: true; leakCents: bigint; status: ReconciliationStatus }
  | { ok: false; message: string };

export async function closeMonth(
  deps: MonthClosingDeps,
  input: { userId: string; profileId: string },
): Promise<CloseMonthResult> {
  const computed = await computeMonthClosing(deps, input);
  if (!computed) {
    return { ok: false, message: "Nenhum mes em aberto para fechar." };
  }

  await deps.closings.upsert({
    userId: input.userId,
    month: MonthYear.fromIso(computed.monthIso).firstDay(),
    baselineNetWorthCents: computed.baselineNetWorthCents,
    endNetWorthCents: computed.endNetWorthCents,
    theoreticalFreeCashFlowCents: computed.theoreticalFreeCashFlowCents,
    leakCents: computed.leakCents,
    endDebtBalanceCents: computed.endDebtBalanceCents,
    endReserveCents: computed.endReserveCents,
    committedPctBps: computed.committedPctBps,
    closedAt: deps.clock.now(),
  });

  return { ok: true, leakCents: computed.leakCents, status: computed.status };
}
