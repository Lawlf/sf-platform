"use server";

import { revalidatePath } from "next/cache";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import {
  creditCardFormSchema,
  financingFormSchema,
  overdraftFormSchema,
  personalLoanFormSchema,
} from "@/presentation/http/validators/debt.validators";
import { isOk } from "@/shared/errors/result";

import { awardEventAchievement } from "../../_actions/_achievements";

type Kind = "financing" | "personal_loan" | "credit_card" | "overdraft";

export type CreateDebtResult = { ok: true; debtId: string } | { ok: false; message: string };

function revalidateDebtPaths(debtId: string): void {
  revalidatePath(`/app/dividas/${debtId}`);
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
}

// Cria a dívida e retorna o id em caso de sucesso. O cliente é responsável pelo redirect
// para permitir composição com outros server actions (ex: vincular ativo após criação).
export async function createDebtAction(kind: Kind, formData: FormData): Promise<CreateDebtResult> {
  const user = await requireUser();

  const raw = Object.fromEntries(formData.entries());

  const deps = {
    debts: new DrizzleDebtRepository(),
    clock: new SystemClock(),
  };

  if (kind === "financing") {
    const parsed = financingFormSchema.safeParse({ ...raw, kind });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
    }
    const d = parsed.data;
    const annualRate = InterestRate.fromAnnual(d.annualRatePct / 100);
    if (!isOk(annualRate)) return { ok: false, message: "Taxa anual inválida." };
    const r = await registerDebt(deps, {
      userId: user.id,
      label: d.label,
      notes: d.notes,
      startDate: d.startDate,
      expectedEndDate: d.expectedEndDate ?? null,
      kind: "financing",
      originalPrincipal: Money.fromCents(d.principalCents),
      annualInterestRate: annualRate.value,
      termMonths: d.termMonths,
      amortizationMethod: d.amortizationMethod,
      monthlyInsurance:
        d.monthlyInsuranceCents !== null ? Money.fromCents(d.monthlyInsuranceCents) : null,
      monthlyAdminFee:
        d.monthlyAdminFeeCents !== null ? Money.fromCents(d.monthlyAdminFeeCents) : null,
      currentBalance: d.currentBalanceCents !== null ? Money.fromCents(d.currentBalanceCents) : null,
    });
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar dívida." };
    await awardEventAchievement(user.id, "primeiro-passo");
    revalidateDebtPaths(r.value.id);
    return { ok: true, debtId: r.value.id };
  }

  if (kind === "personal_loan") {
    const parsed = personalLoanFormSchema.safeParse({ ...raw, kind });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
    }
    const d = parsed.data;
    const annualRate = InterestRate.fromAnnual(d.annualRatePct / 100);
    if (!isOk(annualRate)) return { ok: false, message: "Taxa anual inválida." };
    const r = await registerDebt(deps, {
      userId: user.id,
      label: d.label,
      notes: d.notes,
      startDate: d.startDate,
      expectedEndDate: d.expectedEndDate ?? null,
      kind: "personal_loan",
      originalPrincipal: Money.fromCents(d.principalCents),
      annualInterestRate: annualRate.value,
      termMonths: d.termMonths,
      monthlyInstallment: Money.fromCents(d.monthlyInstallmentCents),
      currentBalance: d.currentBalanceCents !== null ? Money.fromCents(d.currentBalanceCents) : null,
    });
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar dívida." };
    await awardEventAchievement(user.id, "primeiro-passo");
    revalidateDebtPaths(r.value.id);
    return { ok: true, debtId: r.value.id };
  }

  if (kind === "credit_card") {
    const parsed = creditCardFormSchema.safeParse({ ...raw, kind });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
    }
    const d = parsed.data;
    let revolvingRate: InterestRate | null = null;
    if (d.revolvingMonthlyRatePct !== null) {
      const rr = InterestRate.fromMonthly(d.revolvingMonthlyRatePct / 100);
      if (!isOk(rr)) return { ok: false, message: "Taxa rotativo inválida." };
      revolvingRate = rr.value;
    }
    const installmentPurchases = d.installmentPurchasesJson.map((p) => {
      const monthlyCents = p.totalCents / BigInt(p.installmentsTotal);
      return {
        description: p.description,
        total: Money.fromCents(p.totalCents),
        installmentsTotal: p.installmentsTotal,
        installmentsRemaining: p.installmentsRemaining,
        monthlyValue: Money.fromCents(monthlyCents),
      };
    });

    const r = await registerDebt(deps, {
      userId: user.id,
      label: d.label,
      notes: d.notes,
      startDate: d.startDate,
      expectedEndDate: d.expectedEndDate ?? null,
      kind: "credit_card",
      creditLimit: Money.fromCents(d.creditLimitCents),
      currentStatement: Money.fromCents(d.currentStatementCents),
      statementDay: d.statementDay,
      dueDay: d.dueDay,
      revolvingBalance:
        d.revolvingBalanceCents !== null ? Money.fromCents(d.revolvingBalanceCents) : null,
      revolvingMonthlyRate: revolvingRate,
      installmentPurchases,
    });
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar dívida." };
    await awardEventAchievement(user.id, "primeiro-passo");
    revalidateDebtPaths(r.value.id);
    return { ok: true, debtId: r.value.id };
  }

  if (kind === "overdraft") {
    const parsed = overdraftFormSchema.safeParse({ ...raw, kind });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };
    }
    const d = parsed.data;
    const monthly = InterestRate.fromMonthly(d.monthlyRatePct / 100);
    if (!isOk(monthly)) return { ok: false, message: "Taxa mensal inválida." };
    const r = await registerDebt(deps, {
      userId: user.id,
      label: d.label,
      notes: d.notes,
      startDate: d.startDate,
      expectedEndDate: d.expectedEndDate ?? null,
      kind: "overdraft",
      currentBalance: Money.fromCents(d.currentBalanceCents),
      bankName: d.bankName,
      monthlyRate: monthly.value,
    });
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar dívida." };
    await awardEventAchievement(user.id, "primeiro-passo");
    revalidateDebtPaths(r.value.id);
    return { ok: true, debtId: r.value.id };
  }

  return { ok: false, message: "Tipo de dívida desconhecido." };
}
