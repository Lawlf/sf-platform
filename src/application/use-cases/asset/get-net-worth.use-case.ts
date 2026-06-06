import {
  BASE_CURRENCY,
  convertAllocationToBase,
  convertAssetToBase,
  convertDebtToBase,
  type ConvertEntityDeps,
} from "@/application/use-cases/fx/convert-entity-to-base";
import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import {
  computeNetWorthSnapshot,
  type NetWorthSnapshot,
} from "@/domain/services/patrimony.service";
import { type DomainError } from "@/shared/errors/domain-error";
import { isErr, ok, type Result } from "@/shared/errors/result";

export interface GetNetWorthInput {
  userId: string;
}

export interface GetNetWorthDeps extends ConvertEntityDeps {
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

  const convertedAssets: AssetEntity[] = [];
  for (const a of activeAssets) {
    const r = await convertAssetToBase(deps, input.userId, a, BASE_CURRENCY);
    if (isErr(r)) return r;
    convertedAssets.push(r.value);
  }

  const convertedDebts: DebtEntity[] = [];
  for (const d of activeDebts) {
    const r = await convertDebtToBase(deps, input.userId, d, BASE_CURRENCY);
    if (isErr(r)) return r;
    convertedDebts.push(r.value);
  }

  const allocationsPerAsset = await Promise.all(
    convertedAssets.map(async (a) => [a.id, await deps.allocations.findByAsset(a.id)] as const),
  );

  const convertedAllocationsPerAsset: (readonly [string, AssetDebtAllocation[]])[] = [];
  for (const [assetId, allocs] of allocationsPerAsset) {
    const convertedAllocs: AssetDebtAllocation[] = [];
    for (const alloc of allocs) {
      const r = await convertAllocationToBase(deps, input.userId, alloc, BASE_CURRENCY);
      if (isErr(r)) return r;
      convertedAllocs.push(r.value);
    }
    convertedAllocationsPerAsset.push([assetId, convertedAllocs] as const);
  }
  const allocationsByAsset = new Map<string, AssetDebtAllocation[]>(convertedAllocationsPerAsset);

  return ok(
    computeNetWorthSnapshot({
      activeAssets: convertedAssets,
      allocationsByAsset,
      activeDebts: convertedDebts,
    }),
  );
}
