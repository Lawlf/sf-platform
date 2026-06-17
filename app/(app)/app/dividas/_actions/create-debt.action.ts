"use server";

import { z } from "zod";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError, type ActionResult } from "@/presentation/actions/action";
import {
  creditCardFormSchema,
  financingFormSchema,
  overdraftFormSchema,
  personalLoanFormSchema,
} from "@/presentation/http/validators/debt.validators";
import { isOk } from "@/shared/errors/result";

import { awardEventAchievement } from "../../_actions/_achievements";
import { solveAnnualRatePct } from "../_lib/amortization";

export type CreateDebtResult = ActionResult<{ debtId: string }>;

export const createDebtAction = action({
  schema: z.object({ kind: z.string() }).passthrough(),
  revalidates: ["debts", "timeline", "notifications", "home"],
  handler: async (raw, { userId }) => {
    const { kind } = raw;

    const deps = {
      debts: repos.debts,
      clock,
    };

    if (kind === "financing") {
      const parsed = financingFormSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ActionError(parsed.error.issues[0]?.message ?? "Entrada inválida.");
      }
      const d = parsed.data;
      let financingAnnualPct = d.annualRatePct;
      if (financingAnnualPct === null) {
        if (d.monthlyInstallmentCents === null) {
          throw new ActionError("Informe a taxa ou a parcela mensal.");
        }
        const solved = solveAnnualRatePct(d.principalCents, d.monthlyInstallmentCents, d.termMonths);
        if (solved === null) {
          throw new ActionError("A parcela informada não bate com o valor e o prazo; revise.");
        }
        financingAnnualPct = solved;
      }
      const annualRate = InterestRate.fromAnnual(financingAnnualPct / 100);
      if (!isOk(annualRate)) throw new ActionError("Taxa anual inválida.");
      const r = await registerDebt(deps, {
        userId,
        label: d.label,
        notes: d.notes,
        startDate: d.startDate,
        expectedEndDate: d.expectedEndDate ?? null,
        kind: "financing",
        originalPrincipal: Money.fromCents(d.principalCents, d.currency),
        annualInterestRate: annualRate.value,
        termMonths: d.termMonths,
        amortizationMethod: d.amortizationMethod,
        monthlyInsurance:
          d.monthlyInsuranceCents !== null
            ? Money.fromCents(d.monthlyInsuranceCents, d.currency)
            : null,
        monthlyAdminFee:
          d.monthlyAdminFeeCents !== null
            ? Money.fromCents(d.monthlyAdminFeeCents, d.currency)
            : null,
        currentBalance:
          d.currentBalanceCents !== null ? Money.fromCents(d.currentBalanceCents, d.currency) : null,
      });
      if (!isOk(r)) throw new ActionError("Falha ao salvar dívida.");
      await awardEventAchievement(userId, "primeiro-passo");
      return { debtId: r.value.id };
    }

    if (kind === "personal_loan") {
      const parsed = personalLoanFormSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ActionError(parsed.error.issues[0]?.message ?? "Entrada inválida.");
      }
      const d = parsed.data;
      let loanAnnualPct = d.annualRatePct;
      if (loanAnnualPct === null) {
        const solved = solveAnnualRatePct(d.principalCents, d.monthlyInstallmentCents, d.termMonths);
        if (solved === null) {
          throw new ActionError("A parcela informada não bate com o valor e o prazo; revise.");
        }
        loanAnnualPct = solved;
      }
      const annualRate = InterestRate.fromAnnual(loanAnnualPct / 100);
      if (!isOk(annualRate)) throw new ActionError("Taxa anual inválida.");
      const r = await registerDebt(deps, {
        userId,
        label: d.label,
        notes: d.notes,
        startDate: d.startDate,
        expectedEndDate: d.expectedEndDate ?? null,
        kind: "personal_loan",
        originalPrincipal: Money.fromCents(d.principalCents, d.currency),
        annualInterestRate: annualRate.value,
        termMonths: d.termMonths,
        monthlyInstallment: Money.fromCents(d.monthlyInstallmentCents, d.currency),
        currentBalance:
          d.currentBalanceCents !== null ? Money.fromCents(d.currentBalanceCents, d.currency) : null,
        dueDay: d.dueDay,
      });
      if (!isOk(r)) throw new ActionError("Falha ao salvar dívida.");
      await awardEventAchievement(userId, "primeiro-passo");
      return { debtId: r.value.id };
    }

    if (kind === "credit_card") {
      const parsed = creditCardFormSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ActionError(parsed.error.issues[0]?.message ?? "Entrada inválida.");
      }
      const d = parsed.data;
      let revolvingRate: InterestRate | null = null;
      if (d.revolvingMonthlyRatePct !== null) {
        const rr = InterestRate.fromMonthly(d.revolvingMonthlyRatePct / 100);
        if (!isOk(rr)) throw new ActionError("Taxa rotativo inválida.");
        revolvingRate = rr.value;
      }
      const installmentPurchases = d.installmentPurchasesJson.map((p) => {
        const monthlyCents = p.totalCents / BigInt(p.installmentsTotal);
        return {
          description: p.description,
          total: Money.fromCents(p.totalCents, d.currency),
          installmentsTotal: p.installmentsTotal,
          installmentsRemaining: p.installmentsRemaining,
          monthlyValue: Money.fromCents(monthlyCents, d.currency),
        };
      });

      const r = await registerDebt(deps, {
        userId,
        label: d.label,
        notes: d.notes,
        startDate: d.startDate,
        expectedEndDate: d.expectedEndDate ?? null,
        kind: "credit_card",
        creditLimit:
          d.creditLimitCents !== null ? Money.fromCents(d.creditLimitCents, d.currency) : null,
        currentStatement: Money.fromCents(d.currentStatementCents, d.currency),
        statementDay: d.statementDay,
        dueDay: d.dueDay,
        revolvingBalance:
          d.revolvingBalanceCents !== null
            ? Money.fromCents(d.revolvingBalanceCents, d.currency)
            : null,
        revolvingMonthlyRate: revolvingRate,
        installmentPurchases,
      });
      if (!isOk(r)) throw new ActionError("Falha ao salvar dívida.");
      await awardEventAchievement(userId, "primeiro-passo");
      return { debtId: r.value.id };
    }

    if (kind === "overdraft") {
      const parsed = overdraftFormSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ActionError(parsed.error.issues[0]?.message ?? "Entrada inválida.");
      }
      const d = parsed.data;
      const monthly = InterestRate.fromMonthly(d.monthlyRatePct / 100);
      if (!isOk(monthly)) throw new ActionError("Taxa mensal inválida.");
      const r = await registerDebt(deps, {
        userId,
        label: d.label,
        notes: d.notes,
        startDate: d.startDate,
        expectedEndDate: d.expectedEndDate ?? null,
        kind: "overdraft",
        currentBalance: Money.fromCents(d.currentBalanceCents, d.currency),
        bankName: d.bankName,
        monthlyRate: monthly.value,
      });
      if (!isOk(r)) throw new ActionError("Falha ao salvar dívida.");
      await awardEventAchievement(userId, "primeiro-passo");
      return { debtId: r.value.id };
    }

    throw new ActionError("Tipo de dívida desconhecido.");
  },
  revalidatePaths: (data) => [`/app/dividas/${data.debtId}`],
});
