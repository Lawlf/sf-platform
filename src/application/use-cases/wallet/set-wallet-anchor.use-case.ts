import type { AssetEntity } from "@/domain/entities/asset.entity";
import { buildDefaultWallet } from "@/domain/services/default-wallet.factory";
import { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors/result";

import type { NoWalletError } from "./get-wallet-balance.use-case";

export interface SetWalletAnchorDeps {
  assets: {
    findActiveByProfileAndCategory(profileId: string, category: "cash"): Promise<AssetEntity[]>;
    update(asset: AssetEntity): Promise<void>;
    createDefaultWallet(asset: AssetEntity): Promise<void>;
  };
  clock: { now(): Date };
}

export interface SetWalletAnchorInput {
  userId: string;
  profileId: string;
  valueCents: bigint;
}

export async function setWalletAnchor(
  deps: SetWalletAnchorDeps,
  input: SetWalletAnchorInput,
): Promise<Result<{ walletId: string }, NoWalletError>> {
  const cash = await deps.assets.findActiveByProfileAndCategory(input.profileId, "cash");
  let wallet = cash.find((a) => a.label === "Carteira");
  if (!wallet) {
    const fresh = buildDefaultWallet(input.userId, input.profileId, crypto.randomUUID(), deps.clock.now());
    await deps.assets.createDefaultWallet(fresh);
    const after = await deps.assets.findActiveByProfileAndCategory(input.profileId, "cash");
    wallet = after.find((a) => a.label === "Carteira") ?? fresh;
  }

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
