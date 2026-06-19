import { Forbidden } from "@/domain/errors/auth-errors";
import {
  DebtNotFound,
  type InvalidAmortizationParamsError,
} from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import {
  DebtPayoffProjectorService,
  type DebtPayoffProjection,
} from "@/domain/services/debt-payoff-projector.service";
import type { Money } from "@/domain/value-objects/money.vo";
import { err, isOk, ok, type Result } from "@/shared/errors/result";

export interface ProjectDebtPayoffDeps {
  debts: DebtRepositoryPort;
  clock: Clock;
}

export interface ProjectDebtPayoffInput {
  userId: string;
  profileId: string;
  debtId: string;
  monthlyPayment: Money;
  extraPayment?: Money;
}

export async function projectDebtPayoff(
  deps: ProjectDebtPayoffDeps,
  input: ProjectDebtPayoffInput,
): Promise<
  Result<DebtPayoffProjection, DebtNotFound | Forbidden | InvalidAmortizationParamsError>
> {
  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new DebtNotFound("Dívida não encontrada."));
  if (debt.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  const r = DebtPayoffProjectorService.project({
    debt,
    monthlyPayment: input.monthlyPayment,
    ...(input.extraPayment !== undefined ? { extraPayment: input.extraPayment } : {}),
    startingFrom: deps.clock.now(),
    maxMonths: 600,
  });
  if (!isOk(r)) return err(r.error);
  return ok(r.value);
}
