import "server-only";
import {
  loadSimPrefill as loadSimPrefillUseCase,
  type SimPrefill,
} from "@/application/use-cases/simulation/load-sim-prefill.use-case";
import { clock, repos } from "@/infrastructure/container";
import { resolvePfProfileId } from "@/presentation/http/middleware/active-profile";

export type { SimPrefill };

export async function loadSimPrefill(userId: string): Promise<SimPrefill> {
  const profileId = await resolvePfProfileId(userId);
  return loadSimPrefillUseCase(
    {
      assets: repos.assets,
      allocations: repos.assetDebtAllocations,
      debts: repos.debts,
      incomes: repos.incomes,
      clock,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
    },
    { userId, profileId },
  );
}
