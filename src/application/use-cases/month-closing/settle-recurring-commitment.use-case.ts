import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { RecurringSettlementRepositoryPort } from "@/domain/ports/repositories/recurring-settlement.repository";
import { recurringMonthlyEquivalent } from "@/domain/services/timeline.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { err, isErr, ok, type Result } from "@/shared/errors/result";

import { registerDebt } from "../debt/register-debt.use-case";

export interface SettleRecurringCommitmentDeps {
  debts: DebtRepositoryPort;
  settlements: RecurringSettlementRepositoryPort;
  clock: Clock;
}

export type SettleAction = "paid" | "convert_to_debt" | "cancel";

export interface SettleRecurringCommitmentInput {
  userId: string;
  debtId: string;
  /** Mês no formato ISO "YYYY-MM" (ex.: "2026-03"). */
  monthIso: string;
  action: SettleAction;
}

export type SettleRecurringCommitmentError = DebtNotFound | Forbidden;

/**
 * Aplica a decisão do usuário (no fechar-mês) sobre um compromisso recorrente
 * naquele mês:
 *
 * - `paid`: no-op. Pagar é o comportamento padrão; nada é gravado.
 * - `convert_to_debt`: cria uma dívida (personal_loan sem juros, valor = saída
 *   do mês do compromisso) representando o não-pago virado passivo, e grava o
 *   settlement `converted_to_debt` com `createdDebtId`. A timeline passa a
 *   pular a saída desse (compromisso, mês) — sem double-count.
 * - `cancel`: encerra o recorrente setando `expectedEndDate` para o fim do mês,
 *   e grava o settlement `cancelled`.
 *
 * Verifica posse: o debt precisa pertencer ao `userId`.
 */
export async function settleRecurringCommitment(
  deps: SettleRecurringCommitmentDeps,
  input: SettleRecurringCommitmentInput,
): Promise<Result<void, SettleRecurringCommitmentError>> {
  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new DebtNotFound("Compromisso não encontrado."));
  if (debt.userId !== input.userId) return err(new Forbidden("Acesso negado."));

  if (input.action === "paid") {
    return ok(undefined);
  }

  const month = MonthYear.fromIso(input.monthIso);
  const now = deps.clock.now();

  if (input.action === "convert_to_debt") {
    const amount = recurringMonthlyEquivalent(debt, month);
    const zeroRate = InterestRate.fromAnnual(0);
    if (isErr(zeroRate)) throw new Error("zero interest rate setup failed");

    const created = await registerDebt(
      { debts: deps.debts, clock: deps.clock },
      {
        kind: "personal_loan",
        userId: input.userId,
        label: `${debt.label} (${month.format()})`,
        notes: null,
        startDate: month.firstDay(),
        expectedEndDate: null,
        originalPrincipal: amount,
        annualInterestRate: zeroRate.value,
        termMonths: 1,
        monthlyInstallment: amount,
      },
    );
    if (isErr(created)) {
      // personal_loan nunca retorna esse erro (é específico de credit_card),
      // mas o tipo exige tratamento. Repropaga como falha de programação.
      throw new Error("unexpected debt creation error on convert_to_debt");
    }

    const settlement: RecurringSettlementEntity = {
      userId: input.userId,
      debtId: input.debtId,
      month: month.firstDay(),
      status: "converted_to_debt",
      createdDebtId: created.value.id,
      createdAt: now,
    };
    await deps.settlements.upsert(settlement);
    return ok(undefined);
  }

  // input.action === "cancel"
  await deps.debts.update({
    ...debt,
    expectedEndDate: month.lastDay(),
    updatedAt: now,
  });

  const settlement: RecurringSettlementEntity = {
    userId: input.userId,
    debtId: input.debtId,
    month: month.firstDay(),
    status: "cancelled",
    createdDebtId: null,
    createdAt: now,
  };
  await deps.settlements.upsert(settlement);
  return ok(undefined);
}
