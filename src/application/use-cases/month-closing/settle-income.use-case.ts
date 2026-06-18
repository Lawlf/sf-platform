import type {
  IncomeSettlementEntity,
  IncomeSettlementStatus,
} from "@/domain/entities/income-settlement.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { IncomeNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { IncomeSettlementRepositoryPort } from "@/domain/ports/repositories/income-settlement.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface SettleIncomeDeps {
  incomes: IncomeRepositoryPort;
  settlements: IncomeSettlementRepositoryPort;
  clock: Clock;
}

export type IncomeSettleAction = IncomeSettlementStatus;

export interface SettleIncomeInput {
  userId: string;
  profileId: string;
  incomeId: string;
  /** Mês no formato ISO "YYYY-MM" (ex.: "2026-03"). */
  monthIso: string;
  action: IncomeSettleAction;
  /** Valor confirmado quando `action === "adjusted"` (em centavos). */
  adjustedAmountCents?: bigint | null;
}

export type SettleIncomeError = IncomeNotFound | Forbidden;

/**
 * Aplica a confirmação do usuário (no fechar-mês) sobre uma renda naquele mês:
 *
 * - `received`: a renda caiu pelo valor cadastrado.
 * - `not_received`: a renda não caiu (zera a contribuição do mês).
 * - `adjusted`: a renda caiu por outro valor (`adjustedAmountCents`).
 *
 * Grava o settlement (upsert) que sobrescreve a equivalência mensal daquela
 * renda só naquele mês. Verifica posse: a renda precisa pertencer ao `userId`.
 */
export async function settleIncome(
  deps: SettleIncomeDeps,
  input: SettleIncomeInput,
): Promise<Result<void, SettleIncomeError>> {
  const income = await deps.incomes.findById(input.incomeId);
  if (!income) return err(new IncomeNotFound("Renda não encontrada."));
  if (income.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  const month = MonthYear.fromIso(input.monthIso);
  const now = deps.clock.now();

  const settlement: IncomeSettlementEntity = {
    userId: input.userId,
    profileId: input.profileId,
    incomeId: input.incomeId,
    month: month.firstDay(),
    status: input.action,
    adjustedAmountCents:
      input.action === "adjusted" ? (input.adjustedAmountCents ?? 0n) : null,
    createdAt: now,
  };
  await deps.settlements.upsert(settlement);
  return ok(undefined);
}
