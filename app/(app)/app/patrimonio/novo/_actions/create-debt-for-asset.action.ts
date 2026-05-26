"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

const inputSchema = z.object({
  kind: z.enum(["financing", "personal_loan", "credit_card"]),
  label: z.string().min(1, "Informe um rótulo.").max(120, "Máximo de 120 caracteres."),
  principalCents: z.string().regex(/^\d+$/, "Valor inválido."),
  installments: z.coerce.number().int().min(1).max(420),
  monthlyRatePct: z.coerce.number().min(0).max(20),
  startDate: z.string().min(1, "Informe a data de início."),
});

export type CreateDebtForAssetInput = z.input<typeof inputSchema>;

export type CreateDebtForAssetResult =
  | { ok: true; debtId: string }
  | { ok: false; message: string };

// Cálculo da parcela PRICE: P * i / (1 - (1 + i)^-n)
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

export async function createDebtForAssetAction(
  raw: CreateDebtForAssetInput,
): Promise<CreateDebtForAssetResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();
  const v = parsed.data;

  let principalCents: bigint;
  try {
    principalCents = BigInt(v.principalCents);
  } catch {
    return { ok: false, message: "Valor inválido." };
  }
  if (principalCents <= 0n) {
    return { ok: false, message: "Valor deve ser positivo." };
  }

  const startDate = new Date(v.startDate);
  if (Number.isNaN(startDate.getTime())) {
    return { ok: false, message: "Data inválida." };
  }

  const monthlyRateDecimal = v.monthlyRatePct / 100;

  const deps = {
    debts: new DrizzleDebtRepository(),
    clock: new SystemClock(),
  };

  if (v.kind === "financing") {
    const monthlyRate = InterestRate.fromMonthly(monthlyRateDecimal);
    if (!isOk(monthlyRate)) return { ok: false, message: "Taxa mensal inválida." };
    const annualRate = monthlyRate.value.toAnnual();
    const r = await registerDebt(deps, {
      userId: user.id,
      label: v.label.trim(),
      notes: null,
      startDate,
      expectedEndDate: null,
      kind: "financing",
      originalPrincipal: Money.fromCents(principalCents),
      annualInterestRate: annualRate,
      termMonths: v.installments,
      amortizationMethod: "PRICE",
      monthlyInsurance: null,
      monthlyAdminFee: null,
    });
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar dívida." };
    revalidatePath("/app/dividas"); revalidatePath(`/app/dividas/${r.value.id}`); revalidatePath("/app"); revalidatePath("/app/linha-do-tempo");
  return { ok: true, debtId: r.value.id };
  }

  if (v.kind === "personal_loan") {
    const monthlyRate = InterestRate.fromMonthly(monthlyRateDecimal);
    if (!isOk(monthlyRate)) return { ok: false, message: "Taxa mensal inválida." };
    const annualRate = monthlyRate.value.toAnnual();
    const installmentCents = computePriceInstallmentCents(
      principalCents,
      monthlyRateDecimal,
      v.installments,
    );
    const r = await registerDebt(deps, {
      userId: user.id,
      label: v.label.trim(),
      notes: null,
      startDate,
      expectedEndDate: null,
      kind: "personal_loan",
      originalPrincipal: Money.fromCents(principalCents),
      annualInterestRate: annualRate,
      termMonths: v.installments,
      monthlyInstallment: Money.fromCents(installmentCents),
    });
    if (!isOk(r)) return { ok: false, message: "Falha ao salvar dívida." };
    revalidatePath("/app/dividas"); revalidatePath(`/app/dividas/${r.value.id}`); revalidatePath("/app"); revalidatePath("/app/linha-do-tempo");
  return { ok: true, debtId: r.value.id };
  }

  // credit_card: tratamos como compra parcelada simples
  // Usamos principal como fatura atual e definimos limite default 2x.
  const revolvingRate = InterestRate.fromMonthly(monthlyRateDecimal);
  if (!isOk(revolvingRate)) return { ok: false, message: "Taxa mensal inválida." };
  const day = Math.min(28, Math.max(1, startDate.getDate()));
  const dueDay = ((day + 9) % 28) + 1;
  const r = await registerDebt(deps, {
    userId: user.id,
    label: v.label.trim(),
    notes: null,
    startDate,
    expectedEndDate: null,
    kind: "credit_card",
    creditLimit: Money.fromCents(principalCents * 2n),
    currentStatement: Money.fromCents(principalCents),
    statementDay: day,
    dueDay,
    revolvingBalance: null,
    revolvingMonthlyRate: monthlyRateDecimal > 0 ? revolvingRate.value : null,
    installmentPurchases: [],
  });
  if (!isOk(r)) return { ok: false, message: "Falha ao salvar dívida." };
  revalidatePath("/app/dividas"); revalidatePath(`/app/dividas/${r.value.id}`); revalidatePath("/app"); revalidatePath("/app/linha-do-tempo");
  return { ok: true, debtId: r.value.id };
}
