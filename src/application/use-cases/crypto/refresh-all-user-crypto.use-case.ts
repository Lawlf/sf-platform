import type { AssetEntity, AssetMetadata } from "@/domain/entities/asset.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { CryptoQuoteAdapter } from "@/domain/ports/external/crypto-quote-adapter.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { CryptoPriceCatalogRepositoryPort } from "@/domain/ports/repositories/crypto-price-catalog.repository";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { valueCryptoCents } from "@/domain/services/crypto-valuation.service";
import { Money } from "@/domain/value-objects/money.vo";

export interface RefreshAllUserCryptoDeps {
  users: UserRepositoryPort;
  profiles: Pick<ProfileRepositoryPort, "ensurePfProfile">;
  assets: AssetRepositoryPort;
  quotes: CryptoQuoteAdapter;
  catalog: CryptoPriceCatalogRepositoryPort;
  clock: Clock;
}

export interface RefreshAllUserCryptoResult {
  symbols: number;
  updated: number;
  failed: number;
}

function cryptoCoinId(metadata: AssetMetadata | null): string | null {
  if (!metadata || metadata.kind !== "investment" || metadata.investmentType !== "crypto") {
    return null;
  }
  const id = typeof metadata.coinId === "string" ? metadata.coinId.trim().toLowerCase() : "";
  return id.length > 0 ? id : null;
}

export async function refreshAllUserCrypto(
  deps: RefreshAllUserCryptoDeps,
): Promise<RefreshAllUserCryptoResult> {
  const proUsers = await deps.users.findAllPro();
  if (proUsers.length === 0) return { symbols: 0, updated: 0, failed: 0 };

  const assetsByUser: AssetEntity[][] = [];
  const coinIdSet = new Set<string>();
  for (const user of proUsers) {
    const profile = await deps.profiles.ensurePfProfile(user.id, deps.clock.now());
    const userAssets = await deps.assets.findActiveByProfileAndCategory(profile.id, "investment");
    assetsByUser.push(userAssets);
    for (const asset of userAssets) {
      const id = cryptoCoinId(asset.metadata);
      if (id) coinIdSet.add(id);
    }
  }
  const coinIds = Array.from(coinIdSet).sort();
  if (coinIds.length === 0) return { symbols: 0, updated: 0, failed: 0 };

  const prices = await deps.quotes.fetchByIds(coinIds);
  const priceByCoinId = new Map(prices.map((p) => [p.coinId, p] as const));
  if (prices.length > 0) {
    await deps.catalog.upsertMany(
      prices.map((p) => ({
        coinId: p.coinId,
        lastPriceCents: p.priceCents,
        lastFetchedAt: p.fetchedAt,
      })),
    );
  }
  const now = deps.clock.now();

  let updated = 0;
  let failed = 0;
  for (const userAssets of assetsByUser) {
    for (const asset of userAssets) {
      const meta = asset.metadata;
      if (!meta || meta.kind !== "investment" || meta.investmentType !== "crypto") continue;
      const id = typeof meta.coinId === "string" ? meta.coinId.trim().toLowerCase() : "";
      if (id.length === 0) continue;
      const quote = priceByCoinId.get(id);
      if (!quote) {
        failed += 1;
        continue;
      }
      const shares = meta.shares ?? 0;
      const nextMetadata: AssetMetadata = {
        ...meta,
        lastQuoteCents: quote.priceCents,
        lastQuoteAt: quote.fetchedAt,
      };
      await deps.assets.update({
        ...asset,
        metadata: nextMetadata,
        currentValue: Money.fromCents(valueCryptoCents(shares, quote.priceCents)),
        updatedAt: now,
      });
      updated += 1;
    }
  }

  return { symbols: coinIds.length, updated, failed };
}
