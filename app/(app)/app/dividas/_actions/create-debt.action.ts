"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import {
  creditCardFormSchema,
  financingFormSchema,
  overdraftFormSchema,
  personalLoanFormSchema,
} from "@/presentation/http/validators/debt.validators";
import { isOk } from "@/shared/errors";

type Kind = "financing" | "personal_loan" | "credit_card" | "overdraft";

// Function never returns on success because of redirect(); the type is the error-only branch.
export async function createDebtAction(
  kind: Kind,
  formData: FormData,
): Promise<{ ok: false; message: string }> {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  const raw = Object.fromEntries(formData.entries());

  const deps = {
    debts: new DrizzleDebtRepository(),
    clock: new SystemClock(),
  };

  if (kind === "financing") {
    const parsed = financingFormSchema.safeParse({ ...raw, kind });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };
    }
    const d = parsed.data;
    const annualRate = InterestRate.fromAnnual(d.annualRatePct / 100);
    if (!isOk(annualRate)) return { ok: false, message: "Taxa anual invalida." };
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
    });
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar divida." };
    redirect(`/app/dividas/${r.value.id}` as Route);
  }

  if (kind === "personal_loan") {
    const parsed = personalLoanFormSchema.safeParse({ ...raw, kind });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };
    }
    const d = parsed.data;
    const annualRate = InterestRate.fromAnnual(d.annualRatePct / 100);
    if (!isOk(annualRate)) return { ok: false, message: "Taxa anual invalida." };
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
    });
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar divida." };
    redirect(`/app/dividas/${r.value.id}` as Route);
  }

  if (kind === "credit_card") {
    const parsed = creditCardFormSchema.safeParse({ ...raw, kind });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };
    }
    const d = parsed.data;
    let revolvingRate: InterestRate | null = null;
    if (d.revolvingMonthlyRatePct !== null) {
      const rr = InterestRate.fromMonthly(d.revolvingMonthlyRatePct / 100);
      if (!isOk(rr)) return { ok: false, message: "Taxa rotativo invalida." };
      revolvingRate = rr.value;
    }
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
      installmentPurchases: [],
    });
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar divida." };
    redirect(`/app/dividas/${r.value.id}` as Route);
  }

  if (kind === "overdraft") {
    const parsed = overdraftFormSchema.safeParse({ ...raw, kind });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };
    }
    const d = parsed.data;
    const monthly = InterestRate.fromMonthly(d.monthlyRatePct / 100);
    if (!isOk(monthly)) return { ok: false, message: "Taxa mensal invalida." };
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
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar divida." };
    redirect(`/app/dividas/${r.value.id}` as Route);
  }

  return { ok: false, message: "Tipo de divida desconhecido." };
}
