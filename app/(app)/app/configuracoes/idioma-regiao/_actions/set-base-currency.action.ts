"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setBaseCurrency } from "@/application/use-cases/user/set-base-currency.use-case";
import { CURRENCIES } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const schema = z.object({ currency: z.enum(CURRENCIES) });

export async function setBaseCurrencyAction(formData: FormData): Promise<void> {
  const parsed = schema.parse({ currency: formData.get("currency") });
  const user = await requireUser();
  await setBaseCurrency(
    { users: new DrizzleUserRepository(), clock: new SystemClock() },
    { userId: user.id, currency: parsed.currency },
  );
  revalidatePath("/app/configuracoes/idioma-regiao");
  revalidatePath("/app");
}
