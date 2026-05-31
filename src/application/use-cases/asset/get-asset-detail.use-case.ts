import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { AssetNotFound } from "@/domain/errors/asset-errors";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { assetNetWorth, outstandingDebtOnAsset } from "@/domain/services/patrimony.service";
import type { Money } from "@/domain/value-objects/money.vo";
import { type DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface GetAssetDetailInput {
  userId: string;
  assetId: string;
}

export interface LinkedDebtInfo {
  debt: DebtEntity;
  allocationOriginal: Money;
  outstandingOnAsset: Money;
}

export interface GetAssetDetailOutput {
  asset: AssetEntity;
  netWorth: Money;
  linkedDebts: LinkedDebtInfo[];
}

export interface GetAssetDetailDeps {
  assets: AssetRepository;
  allocations: AssetDebtAllocationRepository;
  debts: DebtRepository;
}

/**
 * Detalhe de um ativo: entidade, lista de dívidas vinculadas com o
 * outstanding proporcional, e o patrimônio líquido individual (currentValue
 * menos a soma dos outstandings sobre dívidas ativas).
 */
export async function getAssetDetail(
  deps: GetAssetDetailDeps,
  input: GetAssetDetailInput,
): Promise<Result<GetAssetDetailOutput, DomainError>> {
  const withAllocs = await deps.assets.findByIdWithAllocations(input.assetId, input.userId);
  if (!withAllocs) return err(new AssetNotFound("Ativo não encontrado."));

  const { asset, allocations } = withAllocs;

  const linkedDebts: LinkedDebtInfo[] = [];
  const debtsById = new Map<string, DebtEntity>();
  for (const alloc of allocations) {
    const debt = await deps.debts.findById(alloc.debtId);
    if (!debt) continue;
    debtsById.set(debt.id, debt);
    linkedDebts.push({
      debt,
      allocationOriginal: alloc.allocationOriginal,
      outstandingOnAsset: outstandingDebtOnAsset(
        alloc.allocationOriginal,
        debt.originalPrincipal,
        debt.currentBalance,
      ),
    });
  }

  const netWorth = assetNetWorth({ asset, allocations, debtsById });

  return ok({ asset, netWorth, linkedDebts });
}
