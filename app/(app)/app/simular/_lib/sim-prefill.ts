import "server-only";
import {
  loadSimPrefill as loadSimPrefillUseCase,
  type SimPrefill,
} from "@/application/use-cases/simulation/load-sim-prefill.use-case";
import { clock, repos } from "@/infrastructure/container";


export type { SimPrefill };

export function loadSimPrefill(userId: string): Promise<SimPrefill> {
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
    { userId },
  );
}
