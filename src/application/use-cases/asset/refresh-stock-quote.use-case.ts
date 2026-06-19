import type { AssetEntity, AssetMetadata } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import {
  AssetDeactivated,
  AssetNotFound,
  AssetNotStock,
  QuoteUnavailable,
} from "@/domain/errors/asset-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { QuoteAdapter } from "@/domain/ports/external/quote-adapter.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { StockCatalogRepositoryPort } from "@/domain/ports/repositories/stock-catalog.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RefreshStockQuoteDeps {
  assets: AssetRepositoryPort;
  catalog: StockCatalogRepositoryPort;
  quotes: QuoteAdapter;
  clock: Clock;
}

export interface RefreshStockQuoteInput {
  profileId: string;
  assetId: string;
}

export interface RefreshStockQuoteOutput {
  asset: AssetEntity;
  symbol: string;
  priceCents: bigint;
}

export type RefreshStockQuoteError =
  | AssetNotFound
  | AssetDeactivated
  | AssetNotStock
  | QuoteUnavailable;

/**
 * Janela em horas durante a qual a cotação do catálogo é considerada
 * "fresca" e pode ser reutilizada sem chamar a brapi.
 */
export const CATALOG_FRESH_HOURS = 1;

/**
 * Atualiza o `currentValue` e os metadados de cotação (`lastQuoteCents`,
 * `lastQuoteAt`) de um ativo do tipo ação. Consulta primeiro o catálogo
 * local; se a cotação estiver fresca (menos de `CATALOG_FRESH_HOURS`),
 * reutiliza. Caso contrário, chama o adapter e faz upsert no catálogo,
 * compartilhando o resultado com os demais usuários.
 */
export async function refreshStockQuote(
  deps: RefreshStockQuoteDeps,
  input: RefreshStockQuoteInput,
): Promise<Result<RefreshStockQuoteOutput, RefreshStockQuoteError>> {
  const asset = await deps.assets.findById(input.assetId, input.profileId);
  if (!asset) return err(new AssetNotFound("Ativo não encontrado."));
  if (!isAssetActive(asset)) {
    return err(new AssetDeactivated("Ativo desativado não pode atualizar cotação."));
  }

  if (
    asset.category !== "investment" ||
    asset.metadata === null ||
    asset.metadata.kind !== "investment" ||
    asset.metadata.investmentType !== "stocks"
  ) {
    return err(new AssetNotStock());
  }
  const rawTicker = asset.metadata.ticker?.trim();
  if (!rawTicker) return err(new AssetNotStock("Ativo sem ticker configurado."));
  const ticker = rawTicker.toUpperCase();

  const now = deps.clock.now();
  const freshThresholdMs = CATALOG_FRESH_HOURS * 60 * 60 * 1000;

  let priceCents: bigint | null = null;
  let fetchedAt: Date | null = null;

  const cached = await deps.catalog.findByTicker(ticker);
  if (
    cached !== null &&
    cached.lastPriceCents !== null &&
    cached.lastFetchedAt !== null &&
    now.getTime() - cached.lastFetchedAt.getTime() < freshThresholdMs
  ) {
    priceCents = cached.lastPriceCents;
    fetchedAt = cached.lastFetchedAt;
  } else {
    const quote = await deps.quotes.fetchQuote(ticker);
    if (!quote) return err(new QuoteUnavailable());
    priceCents = quote.priceCents;
    fetchedAt = quote.fetchedAt;
    await deps.catalog.upsert({
      ticker,
      companyName: quote.companyName ?? cached?.companyName ?? null,
      lastPriceCents: quote.priceCents,
      lastFetchedAt: quote.fetchedAt,
    });
  }

  const shares = asset.metadata.shares ?? 0;
  const newValueCents = priceCents * BigInt(shares);

  const nextMetadata: AssetMetadata = {
    ...asset.metadata,
    lastQuoteCents: priceCents,
    lastQuoteAt: fetchedAt,
  };

  const updated: AssetEntity = {
    ...asset,
    metadata: nextMetadata,
    currentValue: Money.fromCents(newValueCents),
    updatedAt: now,
  };

  await deps.assets.update(updated);
  return ok({ asset: updated, symbol: ticker, priceCents });
}
