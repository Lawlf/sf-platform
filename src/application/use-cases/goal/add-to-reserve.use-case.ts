import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";
import { Money } from "@/domain/value-objects/money.vo";

export interface AddToReserveDeps {
  goals: GoalRepository;
  assets: AssetRepository;
}

export type AddToReserveResult = { ok: true } | { ok: false; message: string };

export async function addToReserve(
  deps: AddToReserveDeps,
  input: { userId: string; goalId: string; amountCents: bigint },
): Promise<AddToReserveResult> {
  const { userId, goalId, amountCents } = input;

  if (amountCents <= 0n) {
    return { ok: false, message: "O valor a guardar deve ser maior que zero." };
  }

  const goal = await deps.goals.findById(goalId);
  if (!goal || goal.userId !== userId) {
    return { ok: false, message: "Meta não encontrada." };
  }

  if (goal.type !== "emergency_fund") {
    return { ok: false, message: "Só dá pra guardar dinheiro numa reserva de emergência." };
  }

  const linked = goal.linkedAssetId
    ? await deps.assets.findById(goal.linkedAssetId, userId)
    : null;

  if (linked && linked.category === "cash") {
    const updated: AssetEntity = {
      ...linked,
      currentValue: linked.currentValue.add(Money.fromCents(amountCents)),
      updatedAt: new Date(),
    };
    await deps.assets.update(updated);
    return { ok: true };
  }

  const now = new Date();
  const created: AssetEntity = {
    id: crypto.randomUUID(),
    userId,
    category: "cash",
    label: "Reserva de emergência",
    currentValue: Money.fromCents(amountCents),
    metadata: { kind: "cash", yieldType: "none" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: now,
    updatedAt: now,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
  };

  await deps.assets.create(created);
  await deps.goals.update(goalId, { linkedAssetId: created.id });
  return { ok: true };
}
