"use server";

import { z } from "zod";

import { PriceAmortizationService } from "@/domain/services/amortization/price-amortization.service";
import { SacAmortizationService } from "@/domain/services/amortization/sac-amortization.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

const inputSchema = z.object({
  principalCents: z.string().regex(/^\d+$/).max(20),
  annualRatePct: z.number().nonnegative().max(200),
  termMonths: z.number().int().min(1).max(600),
  amortizationMethod: z.enum(["PRICE", "SAC"]),
});

export type PreviewInstallmentInput = {
  principalCents: string;
  annualRatePct: number;
  termMonths: number;
  amortizationMethod: "PRICE" | "SAC";
};

export type PreviewResult =
  | {
      ok: true;
      firstInstallmentFormatted: string;
      lastInstallmentFormatted: string;
      totalPaidFormatted: string;
      totalInterestFormatted: string;
      isFixed: boolean;
    }
  | { ok: false; message: string };

export async function previewInstallmentAction(raw: unknown): Promise<PreviewResult> {
  await requireUser();
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos para cálculo." };
  }
  const data = parsed.data;

  const principalCents = BigInt(data.principalCents);
  if (principalCents <= 0n) {
    return { ok: false, message: "Valor financiado deve ser positivo." };
  }
  const principal = Money.fromCents(principalCents);

  const rateR = InterestRate.fromAnnual(data.annualRatePct / 100);
  if (!isOk(rateR)) {
    return { ok: false, message: "Taxa anual inválida." };
  }

  const params = {
    principal,
    annualRate: rateR.value,
    termMonths: data.termMonths,
  };
  const scheduleR =
    data.amortizationMethod === "PRICE"
      ? PriceAmortizationService.generate(params)
      : SacAmortizationService.generate(params);

  if (!isOk(scheduleR)) {
    return { ok: false, message: "Não foi possível calcular." };
  }

  const schedule = scheduleR.value;
  const first = schedule.installmentAt(1);
  const last = schedule.installmentAt(schedule.termMonths());
  if (first === null || last === null) {
    return { ok: false, message: "Não foi possível calcular." };
  }

  return {
    ok: true,
    firstInstallmentFormatted: first.installment.format(),
    lastInstallmentFormatted: last.installment.format(),
    totalPaidFormatted: schedule.totalPaid().format(),
    totalInterestFormatted: schedule.totalInterest().format(),
    isFixed: data.amortizationMethod === "PRICE",
  };
}
