import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import {
  computeNetWorthSnapshot,
  type NetWorthSnapshot,
} from "@/domain/services/patrimony.service";
import { type DomainError } from "@/shared/errors/domain-error";
import { ok, type Result } from "@/shared/errors/result";

export interface GetNetWorthInput {
  userId: string;
}

export interface GetNetWorthDeps {
  assets: AssetRepository;
  allocations: AssetDebtAllocationRepository;
  debts: DebtRepository;
}

/**
 * Snapshot global de patrimônio do usuário. Carrega ativos ativos, dívidas
 * ativas e alocações por ativo, delegando o cálculo agregado para o domain
 * service `computeNetWorthSnapshot`.
 */
export async function getNetWorth(
  deps: GetNetWorthDeps,
  input: GetNetWorthInput,
): Promise<Result<NetWorthSnapshot, DomainError>> {
  const activeAssets = await deps.assets.findActiveByUser(input.userId);
  const activeDebts = await deps.debts.listForUser(input.userId, { status: "active" });

  const allocationsPerAsset = await Promise.all(
    activeAssets.map(async (a) => [a.id, await deps.allocations.findByAsset(a.id)] as const),
  );
  const allocationsByAsset = new Map<string, AssetDebtAllocation[]>(allocationsPerAsset);

  return ok(
    computeNetWorthSnapshot({
      activeAssets,
      allocationsByAsset,
      activeDebts,
    }),
  );
}
