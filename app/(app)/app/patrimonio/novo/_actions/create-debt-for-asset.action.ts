"use server";

import { z } from "zod";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { CURRENCIES, Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  kind: z.enum(["financing", "personal_loan", "credit_card"]),
  label: z.string().min(1, "Informe um rótulo.").max(120, "Máximo de 120 caracteres."),
  principalCents: z
    .string()
    .regex(/^\d+$/, "Valor inválido.")
    .refine((s) => BigInt(s) > 0n, "Valor deve ser positivo."),
  installments: z.coerce.number().int().min(1).max(420),
  monthlyRatePct: z.coerce.number().min(0).max(20),
  startDate: z
    .string()
    .min(1, "Informe a data de início.")
    .refine((s) => !Number.isNaN(new Date(s).getTime()), "Data inválida."),
  currency: z.enum(CURRENCIES).default("BRL"),
});

export type CreateDebtForAssetInput = z.input<typeof inputSchema>;

function computePriceInstallmentCents(
  principalCents: bigint,
  monthlyRate: number,
  installments: number,
): bigint {
  if (principalCents <= 0n) return 0n;
  if (installments < 1) return 0n;
  const principal = Number(principalCents) / 100;
  let installmentReais: number;
  if (monthlyRate === 0) {
    installmentReais = principal / installments;
  } else {
    installmentReais = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -installments));
  }
  if (!Number.isFinite(installmentReais) || installmentReais <= 0) return 0n;
  return BigInt(Math.round(installmentReais * 100));
}

export const createDebtForAssetAction = action({
  schema: inputSchema,
  revalidates: ["debts", "home", "timeline"],
  handler: async (v, { userId, profileId }) => {
    const principalCents = BigInt(v.principalCents);
    const startDate = new Date(v.startDate);
    const monthlyRateDecimal = v.monthlyRatePct / 100;

    const deps = {
      debts: repos.debts,
      clock,
    };

    if (v.kind === "financing") {
      const monthlyRate = unwrap(InterestRate.fromMonthly(monthlyRateDecimal));
      const annualRate = monthlyRate.toAnnual();
      const debt = unwrap(
        await registerDebt(deps, {
          userId,
          profileId,
          label: v.label.trim(),
          notes: null,
          startDate,
          expectedEndDate: null,
          kind: "financing",
          originalPrincipal: Money.fromCents(principalCents, v.currency),
          annualInterestRate: annualRate,
          termMonths: v.installments,
          amortizationMethod: "PRICE",
          monthlyInsurance: null,
          monthlyAdminFee: null,
        }),
      );
      return { debtId: debt.id };
    }

    if (v.kind === "personal_loan") {
      const monthlyRate = unwrap(InterestRate.fromMonthly(monthlyRateDecimal));
      const annualRate = monthlyRate.toAnnual();
      const installmentCents = computePriceInstallmentCents(
        principalCents,
        monthlyRateDecimal,
        v.installments,
      );
      const debt = unwrap(
        await registerDebt(deps, {
          userId,
          profileId,
          label: v.label.trim(),
          notes: null,
          startDate,
          expectedEndDate: null,
          kind: "personal_loan",
          originalPrincipal: Money.fromCents(principalCents, v.currency),
          annualInterestRate: annualRate,
          termMonths: v.installments,
          monthlyInstallment: Money.fromCents(installmentCents, v.currency),
        }),
      );
      return { debtId: debt.id };
    }

    const revolvingRate = unwrap(InterestRate.fromMonthly(monthlyRateDecimal));
    const day = Math.min(28, Math.max(1, startDate.getDate()));
    const dueDay = ((day + 9) % 28) + 1;
    const debt = unwrap(
      await registerDebt(deps, {
        userId,
        profileId,
        label: v.label.trim(),
        notes: null,
        startDate,
        expectedEndDate: null,
        kind: "credit_card",
        creditLimit: Money.fromCents(principalCents * 2n, v.currency),
        currentStatement: Money.fromCents(principalCents, v.currency),
        statementDay: day,
        dueDay,
        revolvingBalance: null,
        revolvingMonthlyRate: monthlyRateDecimal > 0 ? revolvingRate : null,
        installmentPurchases: [],
      }),
    );
    return { debtId: debt.id };
  },
  revalidatePaths: (data) => [`/app/dividas/${data.debtId}`],
});
