import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import {
  AllocationExceedsPrincipal,
  AssetDeactivated,
  AssetNotFound,
  DebtNotActive,
  InvalidAllocation,
} from "@/domain/errors/asset-errors";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface LinkAssetToDebtDeps {
  assets: AssetRepository;
  allocations: AssetDebtAllocationRepository;
  debts: DebtRepository;
  clock: Clock;
}

export interface LinkAssetToDebtInput {
  userId: string;
  assetId: string;
  debtId: string;
  allocationOriginalCents: bigint;
}

export type LinkAssetToDebtError =
  | AssetNotFound
  | AssetDeactivated
  | DebtNotFound
  | Forbidden
  | DebtNotActive
  | InvalidAllocation
  | AllocationExceedsPrincipal;

export async function linkAssetToDebt(
  deps: LinkAssetToDebtDeps,
  input: LinkAssetToDebtInput,
): Promise<Result<AssetDebtAllocation, LinkAssetToDebtError>> {
  if (input.allocationOriginalCents <= 0n) {
    return err(new InvalidAllocation("Alocação deve ser maior que zero."));
  }

  const asset = await deps.assets.findById(input.assetId, input.userId);
  if (!asset) return err(new AssetNotFound("Ativo não encontrado."));
  if (!isAssetActive(asset)) {
    return err(new AssetDeactivated("Ativo desativado não pode ser vinculado a dívidas."));
  }

  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new DebtNotFound("Dívida não encontrada."));
  if (debt.userId !== input.userId) {
    return err(new Forbidden("Acesso negado à dívida informada."));
  }
  if (debt.status !== "active") {
    return err(new DebtNotActive(input.debtId));
  }

  // Sum existing allocations on the debt EXCLUDING this asset's existing
  // allocation, so re-linking the same asset+debt pair doesn't double-count
  // its own previous allocation.
  const currentSum = await deps.allocations.sumAllocationsByDebt(input.debtId, input.assetId);
  const principalCents = debt.originalPrincipal.toCents();
  const totalAfter = currentSum.toCents() + input.allocationOriginalCents;
  if (totalAfter > principalCents) {
    const available = principalCents - currentSum.toCents();
    return err(new AllocationExceedsPrincipal(input.debtId, available));
  }

  const now = deps.clock.now();
  const allocation: AssetDebtAllocation = {
    id: crypto.randomUUID(),
    assetId: input.assetId,
    debtId: input.debtId,
    allocationOriginal: Money.fromCents(input.allocationOriginalCents),
    createdAt: now,
    updatedAt: now,
  };
  await deps.allocations.upsert(allocation);
  return ok(allocation);
}
