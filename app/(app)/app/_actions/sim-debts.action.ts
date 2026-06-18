"use server";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

export interface SimDebt {
  id: string;
  label: string;
  currentBalanceFormatted: string;
}

/** Active debts mapped for the simulator forms (mirrors the simular/* pages). */
export async function fetchActiveDebtsForSim(): Promise<SimDebt[]> {
  const user = await requireUser();
  const profileId = await getActiveProfileId();
  const listed = await listDebts(
    { debts: repos.debts },
    { profileId, status: "active" },
  );
  return isOk(listed)
    ? listed.value.map((d) => ({
        id: d.id,
        label: d.label,
        currentBalanceFormatted: d.currentBalance.format(),
      }))
    : [];
}
