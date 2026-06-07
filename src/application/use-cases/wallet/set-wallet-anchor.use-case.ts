import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

import { NoWalletError } from "./get-wallet-balance.use-case";

export interface SetWalletAnchorDeps {
  assets: {
    findActiveByUserAndCategory(userId: string, category: "cash"): Promise<AssetEntity[]>;
    update(asset: AssetEntity): Promise<void>;
  };
  clock: { now(): Date };
}

export interface SetWalletAnchorInput {
  userId: string;
  valueCents: bigint;
}

export async function setWalletAnchor(
  deps: SetWalletAnchorDeps,
  input: SetWalletAnchorInput,
): Promise<Result<{ walletId: string }, NoWalletError>> {
  const cash = await deps.assets.findActiveByUserAndCategory(input.userId, "cash");
  const wallet = cash.find((a) => a.label === "Carteira") ?? cash[0];
  if (!wallet) return err(new NoWalletError());

  const now = deps.clock.now();
  const next: AssetEntity = {
    ...wallet,
    currentValue: Money.fromCents(input.valueCents, wallet.currentValue.currency),
    anchorAt: now,
    updatedAt: now,
  };
  await deps.assets.update(next);
  return ok({ walletId: wallet.id });
}
