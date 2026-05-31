import { Forbidden } from "@/domain/errors/auth-errors";
import {
  DebtNotFound,
  type InvalidAmortizationParamsError,
} from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { DebtPayoffProjectorService } from "@/domain/services/debt-payoff-projector.service";
import type { Money } from "@/domain/value-objects/money.vo";
import { err, isOk, ok, type Result } from "@/shared/errors/result";

export interface SimulateExtraPaymentDeps {
  debts: DebtRepository;
  clock: Clock;
}

export interface SimulateExtraPaymentInput {
  userId: string;
  debtId: string;
  monthlyPayment: Money;
  extraPayment: Money;
}

export interface ExtraPaymentComparison {
  baseline: { payoffMonth: number | null; totalInterest: Money; totalPaid: Money };
  withExtra: { payoffMonth: number | null; totalInterest: Money; totalPaid: Money };
  monthsSaved: number;
  interestSaved: Money;
}

export async function simulateExtraPayment(
  deps: SimulateExtraPaymentDeps,
  input: SimulateExtraPaymentInput,
): Promise<
  Result<ExtraPaymentComparison, DebtNotFound | Forbidden | InvalidAmortizationParamsError>
> {
  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new DebtNotFound("Dívida não encontrada."));
  if (debt.userId !== input.userId) return err(new Forbidden("Acesso negado."));

  const baseline = DebtPayoffProjectorService.project({
    debt,
    monthlyPayment: input.monthlyPayment,
    startingFrom: deps.clock.now(),
    maxMonths: 600,
  });
  if (!isOk(baseline)) return err(baseline.error);

  const withExtra = DebtPayoffProjectorService.project({
    debt,
    monthlyPayment: input.monthlyPayment,
    extraPayment: input.extraPayment,
    startingFrom: deps.clock.now(),
    maxMonths: 600,
  });
  if (!isOk(withExtra)) return err(withExtra.error);

  const monthsSaved = (baseline.value.payoffMonth ?? 600) - (withExtra.value.payoffMonth ?? 600);
  const interestSaved = baseline.value.totalInterest.subtract(withExtra.value.totalInterest);

  return ok({
    baseline: {
      payoffMonth: baseline.value.payoffMonth,
      totalInterest: baseline.value.totalInterest,
      totalPaid: baseline.value.totalPaid,
    },
    withExtra: {
      payoffMonth: withExtra.value.payoffMonth,
      totalInterest: withExtra.value.totalInterest,
      totalPaid: withExtra.value.totalPaid,
    },
    monthsSaved,
    interestSaved,
  });
}
