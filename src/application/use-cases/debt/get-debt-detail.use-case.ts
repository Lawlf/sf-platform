import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { PriceAmortizationService } from "@/domain/services/amortization/price-amortization.service";
import { SacAmortizationService } from "@/domain/services/amortization/sac-amortization.service";
import type { AmortizationSchedule } from "@/domain/value-objects/amortization-schedule.vo";
import { err, isOk, ok, type Result } from "@/shared/errors/result";

export interface GetDebtDetailDeps {
  debts: DebtRepositoryPort;
  payments: DebtPaymentRepositoryPort;
}

export interface GetDebtDetailInput {
  userId: string;
  profileId: string;
  debtId: string;
}

export interface GetDebtDetailOutput {
  debt: DebtEntity;
  amortization: AmortizationSchedule | null;
  payments: DebtPaymentEntity[];
}

export async function getDebtDetail(
  deps: GetDebtDetailDeps,
  input: GetDebtDetailInput,
): Promise<Result<GetDebtDetailOutput, DebtNotFound | Forbidden>> {
  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new DebtNotFound("Dívida não encontrada."));
  if (debt.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  // Dívida "Fora do mês" (parada) não tem plano de pagamento rodando: não faz
  // sentido mostrar cronograma de amortização.
  let amortization: AmortizationSchedule | null = null;
  if (debt.status === "written_off") {
    const payments = await deps.payments.listForDebt(debt.id);
    return ok({ debt, amortization, payments });
  }
  if (debt.kind === "financing") {
    const svc =
      debt.amortizationMethod === "PRICE" ? PriceAmortizationService : SacAmortizationService;
    const s = svc.generate({
      principal: debt.originalPrincipal,
      annualRate: debt.annualInterestRate,
      termMonths: debt.termMonths,
    });
    if (isOk(s)) amortization = s.value;
  } else if (debt.kind === "personal_loan") {
    const s = PriceAmortizationService.generate({
      principal: debt.originalPrincipal,
      annualRate: debt.annualInterestRate,
      termMonths: debt.termMonths,
    });
    if (isOk(s)) amortization = s.value;
  }

  const payments = await deps.payments.listForDebt(debt.id);
  return ok({ debt, amortization, payments });
}
