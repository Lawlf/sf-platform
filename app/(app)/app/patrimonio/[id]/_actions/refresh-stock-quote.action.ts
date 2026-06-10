"use server";

import { z } from "zod";

import { refreshStockQuote } from "@/application/use-cases/asset/refresh-stock-quote.use-case";
import { clock, repos } from "@/infrastructure/container";
import { BrapiQuoteAdapter } from "@/infrastructure/external/brapi/brapi-quote.adapter";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  assetId: z.string().uuid(),
});

export const refreshStockQuoteAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts", "timeline", "home"],
  handler: async (input, { userId }) => {
    const quote = unwrap(
      await refreshStockQuote(
        {
          assets: repos.assets,
          catalog: repos.stockCatalog,
          quotes: new BrapiQuoteAdapter(),
          clock,
        },
        { userId, assetId: input.assetId },
      ),
    );

    return {
      symbol: quote.symbol,
      priceCents: quote.priceCents.toString(),
    };
  },
  revalidatePaths: (_data, input) => [`/app/patrimonio/${input.assetId}`],
});
