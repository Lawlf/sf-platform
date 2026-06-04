import "server-only";

import {
  loadSimPrefill as loadSimPrefillUseCase,
  type SimPrefill,
} from "@/application/use-cases/simulation/load-sim-prefill.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";

export type { SimPrefill };

export function loadSimPrefill(userId: string): Promise<SimPrefill> {
  return loadSimPrefillUseCase(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: new DrizzleDebtRepository(),
      incomes: new DrizzleIncomeRepository(),
      clock: new SystemClock(),
    },
    { userId },
  );
}
