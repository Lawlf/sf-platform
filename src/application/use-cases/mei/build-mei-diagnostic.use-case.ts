import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { MeiMonthlyRepositoryPort } from "@/domain/ports/repositories/mei-monthly.repository";
import { diagnoseMei } from "@/domain/services/mei/mei-diagnostic.service";
import type { MeiDiagnostic } from "@/domain/services/mei/mei-diagnostic.types";
import { WEEKS_PER_MONTH } from "@/domain/services/monthly-frequency";
import { ok, type Result } from "@/shared/errors/result";

import type { GetWalletBalanceDeps } from "../wallet/get-wallet-balance.use-case";
import { getWalletBalance } from "../wallet/get-wallet-balance.use-case";

export interface BuildMeiDiagnosticDeps extends GetWalletBalanceDeps {
  incomes: Pick<IncomeRepositoryPort, "listForProfile">;
  debts: Pick<DebtRepositoryPort, "listForProfile">;
  meiMonthly: Pick<MeiMonthlyRepositoryPort, "findByProfileCompetencia">;
}

export interface BuildMeiDiagnosticInput {
  pfProfileId: string;
  pjProfileId: string;
  userId: string;
  competencia: Date;
}

function monthlyIncomeCents(income: IncomeEntity, asOf: Date): bigint {
  if (!income.isActive) return 0n;
  if (income.startDate.getTime() > asOf.getTime()) return 0n;
  if (income.endDate !== null && income.endDate.getTime() < asOf.getTime()) return 0n;

  const amountCents = income.amount.toCents();
  switch (income.frequency) {
    case "monthly":
      return amountCents;
    case "weekly":
      return BigInt(Math.round(Number(amountCents) * WEEKS_PER_MONTH));
    case "one_off": {
      const sameMonth =
        income.startDate.getUTCFullYear() === asOf.getUTCFullYear() &&
        income.startDate.getUTCMonth() === asOf.getUTCMonth();
      return sameMonth ? amountCents : 0n;
    }
  }
}

function monthlyRecurringDebtCents(debt: DebtEntity): bigint {
  if (debt.kind !== "recurring") return 0n;
  const amountCents = debt.recurringAmountCents;
  if (debt.recurringFrequency === "weekly") {
    return BigInt(Math.round(Number(amountCents) * WEEKS_PER_MONTH));
  }
  return amountCents;
}

export async function buildMeiDiagnostic(
  deps: BuildMeiDiagnosticDeps,
  input: BuildMeiDiagnosticInput,
): Promise<Result<MeiDiagnostic, never>> {
  const asOf = deps.clock.now();

  const [pjIncomes, pjDebts, pfDebts, meiEntry, walletResult] = await Promise.all([
    deps.incomes.listForProfile(input.pjProfileId, { onlyActive: true }),
    deps.debts.listForProfile(input.pjProfileId, { status: "active" }),
    deps.debts.listForProfile(input.pfProfileId, { status: "active" }),
    deps.meiMonthly.findByProfileCompetencia(input.pjProfileId, input.competencia),
    getWalletBalance(deps, { userId: input.userId, profileId: input.pfProfileId }),
  ]);

  const faturamentoMensalCents = pjIncomes.reduce(
    (sum, i) => sum + monthlyIncomeCents(i, asOf),
    0n,
  );

  const pjRecurring = pjDebts.filter((d) => d.kind === "recurring");
  let dasCents = 0n;
  let despesasOperacionaisCents = 0n;
  for (const d of pjRecurring) {
    const monthlyCents = monthlyRecurringDebtCents(d);
    if (d.expenseCategory === "das-mei") {
      dasCents += monthlyCents;
    } else {
      despesasOperacionaisCents += monthlyCents;
    }
  }

  const proLaboreCents = meiEntry?.proLaboreCents ?? 0n;
  const gastoPessoalPjCents = meiEntry?.gastoPessoalPjCents ?? 0n;

  const custoDeVidaMensalCents = pfDebts
    .filter((d) => d.kind === "recurring")
    .reduce((sum, d) => sum + monthlyRecurringDebtCents(d), 0n);

  const saldoPfCents =
    walletResult._tag === "ok" ? walletResult.value.reactiveBalance.toCents() : 0n;

  const diagnostic = diagnoseMei({
    faturamentoMensalCents,
    despesasOperacionaisCents,
    dasCents,
    proLaboreCents,
    gastoPessoalPjCents,
    custoDeVidaMensalCents,
    saldoPfCents,
  });

  return ok(diagnostic);
}
