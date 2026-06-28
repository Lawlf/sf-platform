"use server";

import { registerIncome } from "@/application/use-cases/income/register-income.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
import { incomeFormSchema } from "@/presentation/http/validators/income.validators";

import { awardEventAchievement } from "../../_actions/_achievements";
import { computeFreeBalanceEvent, type IncomeFreeBalanceEvent } from "../../_actions/_free-balance-event";

export const createIncomeAction = action({
  schema: incomeFormSchema,
  revalidates: ["incomes", "home", "timeline"],
  handler: async (data, { userId, profileId }): Promise<{ event: IncomeFreeBalanceEvent | null }> => {
    const amount = Money.fromCents(BigInt(data.amountCents), data.currency);

    await registerIncome(
      { incomes: repos.incomes, clock },
      {
        userId,
        profileId,
        label: data.label,
        amount,
        frequency: data.frequency,
        startDate: data.startDate,
        endDate: data.endDate,
        paymentDay: data.paymentDay,
        isEstimated: data.isEstimated,
        sourceBreakdown: data.sourceBreakdown,
      },
    );

    await awardEventAchievement(userId, "renda-a-vista");

    return { event: await computeFreeBalanceEvent(userId, profileId, amount) };
  },
});
