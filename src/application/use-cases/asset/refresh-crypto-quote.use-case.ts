import type { AssetEntity, AssetMetadata } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import {
  AssetDeactivated,
  AssetNotCrypto,
  AssetNotFound,
  QuoteUnavailable,
} from "@/domain/errors/asset-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { CryptoQuoteAdapter } from "@/domain/ports/external/crypto-quote-adapter.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { valueCryptoCents } from "@/domain/services/crypto-valuation.service";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RefreshCryptoQuoteDeps {
  assets: AssetRepositoryPort;
  quotes: CryptoQuoteAdapter;
  clock: Clock;
}

export interface RefreshCryptoQuoteInput {
  userId: string;
  assetId: string;
}

export interface RefreshCryptoQuoteOutput {
  asset: AssetEntity;
  symbol: string;
  priceCents: bigint;
}

export type RefreshCryptoQuoteError =
  | AssetNotFound
  | AssetDeactivated
  | AssetNotCrypto
  | QuoteUnavailable;

export async function refreshCryptoQuote(
  deps: RefreshCryptoQuoteDeps,
  input: RefreshCryptoQuoteInput,
): Promise<Result<RefreshCryptoQuoteOutput, RefreshCryptoQuoteError>> {
  const asset = await deps.assets.findById(input.assetId, input.userId);
  if (!asset) return err(new AssetNotFound("Ativo não encontrado."));
  if (!isAssetActive(asset)) {
    return err(new AssetDeactivated("Ativo desativado não pode atualizar cotação."));
  }
  if (
    asset.category !== "investment" ||
    asset.metadata === null ||
    asset.metadata.kind !== "investment" ||
    asset.metadata.investmentType !== "crypto"
  ) {
    return err(new AssetNotCrypto());
  }
  const coinId = asset.metadata.coinId?.trim();
  if (!coinId) return err(new AssetNotCrypto("Ativo sem moeda configurada."));
  const symbol = (asset.metadata.ticker ?? coinId).trim().toUpperCase();

  const prices = await deps.quotes.fetchByIds([coinId]);
  const quote = prices[0];
  if (!quote || quote.priceCents == null) return err(new QuoteUnavailable());

  const now = deps.clock.now();
  const shares = asset.metadata.shares ?? 0;
  const newValueCents = valueCryptoCents(shares, quote.priceCents);

  const nextMetadata: AssetMetadata = {
    ...asset.metadata,
    lastQuoteCents: quote.priceCents,
    lastQuoteAt: quote.fetchedAt,
  };

  const updated: AssetEntity = {
    ...asset,
    metadata: nextMetadata,
    currentValue: Money.fromCents(newValueCents),
    updatedAt: now,
  };

  await deps.assets.update(updated);
  return ok({ asset: updated, symbol, priceCents: quote.priceCents });
}
