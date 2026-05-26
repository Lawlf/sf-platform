import { Forbidden } from "@/domain/errors/auth-errors";
import {
  type DebtNotFound,
  InvalidAmortizationParamsError,
} from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import {
  PayoffStrategyService,
  type PayoffComparison,
} from "@/domain/services/payoff-strategy.service";
import type { Money } from "@/domain/value-objects/money.vo";
import { err, isOk, ok, type Result } from "@/shared/errors/result";

export interface ComparePayoffStrategiesDeps {
  debts: DebtRepository;
  clock: Clock;
}

export interface ComparePayoffStrategiesInput {
  userId: string;
  debtIds: string[];
  monthlyBudget: Money;
}

export async function comparePayoffStrategies(
  deps: ComparePayoffStrategiesDeps,
  input: ComparePayoffStrategiesInput,
): Promise<Result<PayoffComparison, DebtNotFound | Forbidden | InvalidAmortizationParamsError>> {
  const allActive = await deps.debts.listForUser(input.userId, { status: "active" });
  let selected = allActive;
  if (input.debtIds.length > 0) {
    selected = allActive.filter((d) => input.debtIds.includes(d.id));
    if (selected.length !== input.debtIds.length) {
      return err(new Forbidden("Divida invalida na selecao."));
    }
  }
  if (selected.length === 0) {
    return err(new InvalidAmortizationParamsError("Selecione ao menos uma divida ativa."));
  }
  const r = PayoffStrategyService.compare({
    debts: selected,
    monthlyBudget: input.monthlyBudget,
    startingFrom: deps.clock.now(),
    maxMonths: 600,
  });
  if (!isOk(r)) return err(r.error);
  return ok(r.value);
}
