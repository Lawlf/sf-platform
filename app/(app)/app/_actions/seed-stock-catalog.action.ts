"use server";

import { seedStockCatalog } from "@/application/use-cases/stocks/seed-stock-catalog.use-case";
import { timingSafeStringEqual } from "@/infrastructure/auth/timing-safe-compare";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { BrapiQuoteAdapter } from "@/infrastructure/external/brapi/brapi-quote.adapter";

export type SeedStockCatalogResult =
  | { ok: true; inserted: number; pages: number }
  | { ok: false; message: string };

/**
 * Popula o catálogo local de ações a partir da listagem pública da brapi.
 * Autenticada via `CRON_SECRET` para evitar que qualquer requisição
 * autenticada dispare a chamada paga.
 */
export async function seedStockCatalogAction(
  secret: string,
  opts?: { maxPages?: number; pageSize?: number },
): Promise<SeedStockCatalogResult> {
  const env = loadEnv();
  const expected = env.CRON_SECRET;
  if (!expected || !timingSafeStringEqual(secret, expected)) {
    return { ok: false, message: "Unauthorized" };
  }
  try {
    const input: { maxPages?: number; pageSize?: number } = {};
    if (typeof opts?.maxPages === "number") input.maxPages = opts.maxPages;
    if (typeof opts?.pageSize === "number") input.pageSize = opts.pageSize;
    const result = await seedStockCatalog(
      {
        catalog: repos.stockCatalog,
        quotes: new BrapiQuoteAdapter(),
        clock,
      },
      input,
    );
    return { ok: true, ...result };
  } catch {
    return { ok: false, message: "Falha ao popular catálogo." };
  }
}
