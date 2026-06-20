"use server";

import { z } from "zod";

import { updateIncome } from "@/application/use-cases/income/update-income.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";
import { incomeFormSchema } from "@/presentation/http/validators/income.validators";

const updateSchema = incomeFormSchema.extend({
  incomeId: z.string().uuid("ID inválido."),
});

export const updateIncomeAction = action({
  schema: updateSchema,
  revalidates: ["incomes", "home"],
  handler: async (data, { userId, profileId }) => {
    const amount = Money.fromCents(BigInt(data.amountCents), data.currency);

    unwrap(
      await updateIncome(
        { incomes: repos.incomes, clock },
        {
          userId,
          profileId,
          incomeId: data.incomeId,
          label: data.label,
          amount,
          frequency: data.frequency,
          startDate: data.startDate,
          endDate: data.endDate,
          paymentDay: data.paymentDay,
          isEstimated: data.isEstimated,
          sourceBreakdown: data.sourceBreakdown,
        },
      ),
    );
  },
});
