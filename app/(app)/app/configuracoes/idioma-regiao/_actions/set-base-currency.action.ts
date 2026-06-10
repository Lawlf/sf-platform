"use server";

import { z } from "zod";

import { setBaseCurrency } from "@/application/use-cases/user/set-base-currency.use-case";
import { CURRENCIES } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const setBaseCurrencyAction = action({
  schema: z.object({ currency: z.enum(CURRENCIES) }),
  revalidates: ["home"],
  handler: async ({ currency }, { userId }) => {
    unwrap(
      await setBaseCurrency(
        { users: repos.users, clock },
        { userId, currency },
      ),
    );
  },
  revalidatePaths: () => ["/app/configuracoes/idioma-regiao"],
});
