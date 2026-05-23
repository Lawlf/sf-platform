"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { refreshStockQuote } from "@/application/use-cases/asset/refresh-stock-quote.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { BrapiQuoteAdapter } from "@/infrastructure/external/brapi/brapi-quote.adapter";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleStockCatalogRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-stock-catalog.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

const inputSchema = z.object({
  assetId: z.string().uuid(),
});

export type RefreshStockQuoteResult =
  | { ok: true; symbol: string; priceCents: string }
  | { ok: false; message: string };

export async function refreshStockQuoteAction(
  formInput: unknown,
): Promise<RefreshStockQuoteResult> {
  const parsed = inputSchema.safeParse(formInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();

  const r = await refreshStockQuote(
    {
      assets: new DrizzleAssetRepository(),
      catalog: new DrizzleStockCatalogRepository(),
      quotes: new BrapiQuoteAdapter(),
      clock: new SystemClock(),
    },
    { userId: user.id, assetId: parsed.data.assetId },
  );

  if (!isOk(r)) {
    return { ok: false, message: r.error.message };
  }
  revalidatePath(`/app/patrimonio/${parsed.data.assetId}`);
  revalidatePath("/app/patrimonio");
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app");
  return {
    ok: true,
    symbol: r.value.symbol,
    priceCents: r.value.priceCents.toString(),
  };
}
