"use server";

import { z } from "zod";

import { comparePayoffStrategies } from "@/application/use-cases/simulation/compare-payoff-strategies.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isErr } from "@/shared/errors";

const schema = z.object({
  debtIds: z.string().transform((v) => (v.length === 0 ? [] : v.split(",").filter(Boolean))),
  monthlyBudgetCents: z.coerce.bigint().positive(),
});

export type StrategyActionResult =
  | {
      ok: true;
      snowball: {
        order: string[];
        monthsToFreedom: number | null;
        totalInterest: string;
        totalPaid: string;
      };
      avalanche: {
        order: string[];
        monthsToFreedom: number | null;
        totalInterest: string;
        totalPaid: string;
      };
    }
  | { ok: false; message: string };

export async function runStrategyAction(formData: FormData): Promise<StrategyActionResult> {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };

  const r = await comparePayoffStrategies(
    { debts: new DrizzleDebtRepository(), clock: new SystemClock() },
    {
      userId: user.id,
      debtIds: parsed.data.debtIds,
      monthlyBudget: Money.fromCents(parsed.data.monthlyBudgetCents),
    },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  return {
    ok: true,
    snowball: {
      order: r.value.snowball.order,
      monthsToFreedom: r.value.snowball.monthsToFreedom,
      totalInterest: r.value.snowball.totalInterest.format(),
      totalPaid: r.value.snowball.totalPaid.format(),
    },
    avalanche: {
      order: r.value.avalanche.order,
      monthsToFreedom: r.value.avalanche.monthsToFreedom,
      totalInterest: r.value.avalanche.totalInterest.format(),
      totalPaid: r.value.avalanche.totalPaid.format(),
    },
  };
}
