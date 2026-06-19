"use server";

import { z } from "zod";

import { recordPayment } from "@/application/use-cases/debt/record-payment.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { UpstashDistributedLock } from "@/infrastructure/cache/upstash-distributed-lock";
import { clock, repos } from "@/infrastructure/container";
import { withTransaction } from "@/infrastructure/persistence/drizzle/with-transaction";
import { action, unwrap } from "@/presentation/actions/action";

import { awardEventAchievement } from "../../../../_actions/_achievements";
import { detectNotificationsForUser } from "../../../../_actions/_notifications";

const schema = z.object({
  debtId: z.string().uuid(),
  paidAt: z.coerce.date().refine(
    (d) => {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      return d.getTime() <= endOfToday.getTime();
    },
    { message: "Data do pagamento não pode ser no futuro." },
  ),
  amountCents: z.coerce.bigint().positive(),
  principalCents: z.coerce.bigint().nonnegative(),
  interestCents: z.coerce.bigint().nonnegative(),
  isExtra: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const recordPaymentAction = action({
  schema,
  revalidates: ["debts", "timeline", "notifications", "home"],
  handler: async (d, { userId, profileId }) => {
    const payment = unwrap(
      await recordPayment(
        {
          debts: repos.debts,
          payments: repos.debtPayments,
          clock,
          lock: new UpstashDistributedLock(),
          transaction: withTransaction,
        },
        {
          userId,
          profileId,
          debtId: d.debtId,
          amount: Money.fromCents(d.amountCents),
          principalPortion: Money.fromCents(d.principalCents),
          interestPortion: Money.fromCents(d.interestCents),
          isExtra: d.isExtra,
          paidAt: d.paidAt,
        },
      ),
    );
    await detectNotificationsForUser(userId);
    const settledDebt = await repos.debts.findById(d.debtId);
    if (settledDebt?.status === "paid_off") {
      await awardEventAchievement(userId, "quitacao", { debtLabel: settledDebt.label });
    }
    return { debtId: d.debtId, paymentId: payment.id };
  },
  revalidatePaths: (_data, { debtId }) => [`/app/dividas/${debtId}`],
});
