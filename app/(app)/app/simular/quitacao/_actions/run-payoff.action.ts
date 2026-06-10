"use server";

import { z } from "zod";


import { projectDebtPayoff } from "@/application/use-cases/simulation/project-debt-payoff.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, type ActionResult, unwrap } from "@/presentation/actions/action";

import { awardEventAchievement } from "../../../_actions/_achievements";

const schema = z.object({
  debtId: z.string().uuid(),
  monthlyPaymentCents: z.coerce.bigint().positive(),
  extraPaymentCents: z.coerce.bigint().nonnegative().optional(),
});

export interface PayoffData {
  payoffMonth: number | null;
  payoffDate: string | null;
  totalPaid: string;
  totalInterest: string;
  negativeAmortization: boolean;
}

export type PayoffActionResult = ActionResult<PayoffData>;

export const runPayoffAction = action({
  schema,
  handler: async (input, { userId }): Promise<PayoffData> => {
    const r = unwrap(
      await projectDebtPayoff(
        { debts: repos.debts, clock },
        {
          userId,
          debtId: input.debtId,
          monthlyPayment: Money.fromCents(input.monthlyPaymentCents),
          ...(input.extraPaymentCents !== undefined
            ? { extraPayment: Money.fromCents(input.extraPaymentCents) }
            : {}),
        },
      ),
    );
    await awardEventAchievement(userId, "simulou-futuro");
    return {
      payoffMonth: r.payoffMonth,
      payoffDate: r.payoffDate?.toISOString() ?? null,
      totalPaid: r.totalPaid.format(),
      totalInterest: r.totalInterest.format(),
      negativeAmortization: r.negativeAmortization,
    };
  },
});
