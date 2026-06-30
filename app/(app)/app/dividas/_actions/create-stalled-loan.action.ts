"use server";

import { z } from "zod";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError, type ActionResult } from "@/presentation/actions/action";
import { currencyEnum, positiveBigint } from "@/presentation/http/validators/shared.validators";
import { isOk } from "@/shared/errors/result";

import { awardEventAchievement } from "../../_actions/_achievements";

export type CreateStalledLoanResult = ActionResult<{ debtId: string }>;

/**
 * "Dívida parada": empréstimo que a pessoa não paga agora (esperando negociar).
 * Guarda só o nome e quanto deve; nasce "Fora do mês" (written_off): fica no
 * total a pagar, fora do comprometido, sem parcela nem vencimento inventado.
 */
export const createStalledLoanAction = action({
  schema: z.object({
    label: z.string().min(1).max(120),
    currency: currencyEnum,
    currentBalanceCents: positiveBigint,
  }),
  revalidates: ["debts", "timeline", "notifications", "home"],
  handler: async (d, { userId, profileId }) => {
    const balance = Money.fromCents(d.currentBalanceCents, d.currency);
    const zeroRate = InterestRate.fromAnnual(0);
    if (!isOk(zeroRate)) throw new ActionError("Erro interno.");

    const r = await registerDebt(
      { debts: repos.debts, clock },
      {
        userId,
        profileId,
        label: d.label,
        notes: null,
        startDate: clock.now(),
        expectedEndDate: null,
        kind: "personal_loan",
        originalPrincipal: balance,
        annualInterestRate: zeroRate.value,
        termMonths: 1,
        monthlyInstallment: Money.zero(d.currency),
        currentBalance: balance,
        dueDay: null,
      },
    );
    if (!isOk(r)) throw new ActionError("Falha ao salvar dívida.");

    await repos.debts.setStatus(r.value.id, "written_off");
    await awardEventAchievement(userId, "primeiro-passo");
    return { debtId: r.value.id };
  },
  revalidatePaths: (data) => [`/app/dividas/${data.debtId}`],
});
