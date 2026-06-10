"use server";

import { z } from "zod";

import { refreshCryptoQuote } from "@/application/use-cases/asset/refresh-crypto-quote.use-case";
import { clock, repos } from "@/infrastructure/container";
import { CoinGeckoQuoteAdapter } from "@/infrastructure/external/coingecko/coingecko-quote.adapter";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  assetId: z.string().uuid(),
});

export const refreshCryptoQuoteAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts", "timeline", "home"],
  handler: async (input, { userId }) => {
    const quote = unwrap(
      await refreshCryptoQuote(
        {
          assets: repos.assets,
          quotes: new CoinGeckoQuoteAdapter(),
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
