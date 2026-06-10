import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { InvestmentSnapshotRepositoryPort } from "@/domain/ports/repositories/investment-snapshot.repository";
import { investmentBreakdown } from "@/domain/services/investment-breakdown.service";

export interface CaptureInvestmentSnapshotDeps {
  snapshots: InvestmentSnapshotRepositoryPort;
  clock: Clock;
}

export interface CaptureInvestmentSnapshotInput {
  userId: string;
  assets: AssetEntity[];
}

function firstOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Captura a foto do mês atual: total investido por tipo. Idempotente
 * (replaceMonth). Reusa `investmentBreakdown`.
 */
export async function captureInvestmentSnapshot(
  deps: CaptureInvestmentSnapshotDeps,
  input: CaptureInvestmentSnapshotInput,
): Promise<void> {
  const now = deps.clock.now();
  const month = firstOfMonth(now);
  const rows = investmentBreakdown(input.assets).map((b) => ({
    investmentType: b.investmentType,
    totalValueCents: b.totalValueCents,
  }));
  await deps.snapshots.replaceMonth(input.userId, month, rows, now);
}
