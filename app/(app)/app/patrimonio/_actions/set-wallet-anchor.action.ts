"use server";

import { z } from "zod";

import { setWalletAnchor } from "@/application/use-cases/wallet/set-wallet-anchor.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  valueCents: z.string().regex(/^\d+$/, "Valor inválido."),
});

export const setWalletAnchorAction = action({
  schema: inputSchema,
  revalidates: ["assets", "timeline", "home"],
  handler: async (input, { userId }) => {
    unwrap(
      await setWalletAnchor(
        { assets: repos.assets, clock },
        { userId, valueCents: BigInt(input.valueCents) },
      ),
    );
  },
});
