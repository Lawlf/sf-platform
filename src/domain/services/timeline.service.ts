import type { AssetEntity } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import type {
  DebtAmountAdjustmentEntity,
  OverrideAdjustment,
  PeriodAdjustment,
} from "@/domain/entities/debt-amount-adjustment.entity";
import { periodCovers } from "@/domain/entities/debt-amount-adjustment.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { AssetValuationService } from "@/domain/services/asset-valuation.service";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";

/**
 * Um ponto mensal da linha do tempo (macro). Cada ponto sintetiza renda,
 * pagamentos totais (parcelas de dívida tradicional + recorrências derivadas
 * do kind `recurring`), saldo livre, patrimônio e dívidas em aberto naquele
 * mês. Toda agregação é pura (sem I/O); o caller alimenta o que vem do banco
 * e desenha o gráfico.
 *
 * Histórico: o campo `totalExpenses` foi removido no merge Expense -> Debt.
 * Os compromissos recorrentes agora estão modelados como dívidas
 * (`kind = "recurring"`) e entram em `totalDebtPayments`.
 */
export interface MonthlyDataPoint {
  month: MonthYear;
  totalIncome: Money;
  totalDebtPayments: Money;
  freeBalance: Money;
  netWorth: Money;
  assetsTotal: Money;
  debtsBalance: Money;
}

export interface Timeline {
  points: MonthlyDataPoint[];
}

export interface BuildTimelineInput {
  incomes: IncomeEntity[];
  debts: DebtEntity[];
  payments: DebtPaymentEntity[];
  assets: AssetEntity[];
  from: MonthYear;
  to: MonthYear;
  /**
   * Ajustes históricos de valor por dívida (períodos + overrides). Quando
   * presente, sobrescreve o valor base de dívidas `recurring` no cálculo da
   * outflow mensal. Opcional para backward compat com testes existentes.
   */
  adjustments?: DebtAmountAdjustmentEntity[];
}

// 52 semanas / 12 meses = 4.333...
const WEEKS_PER_MONTH = 4.33;

/**
 * Equivalência mensal de uma renda em um dado mês.
 *
 * - `monthly`: o valor próprio (se ativa naquele mês).
 * - `weekly`: amount * 4.33 (se ativa naquele mês).
 * - `one_off`: amount apenas no mês de `startDate`.
 *
 * Considera `startDate`, `endDate` e o flag `isActive` para zerar fora do
 * intervalo. `isActive=false` zera meses posteriores a `endDate` (ou todos,
 * se `endDate` for null).
 */
function incomeMonthlyEquivalent(income: IncomeEntity, month: MonthYear): Money {
  const startMonth = MonthYear.fromDate(income.startDate);
  if (month.isBefore(startMonth)) return Money.fromCents(0n);
  if (income.endDate) {
    const endMonth = MonthYear.fromDate(income.endDate);
    if (month.isAfter(endMonth)) return Money.fromCents(0n);
  } else if (!income.isActive) {
    // Sem endDate explícito mas inativa => trata como já encerrada.
    return Money.fromCents(0n);
  }
  switch (income.frequency) {
    case "monthly":
      return income.amount;
    case "weekly": {
      const cents = Number(income.amount.toCents()) * WEEKS_PER_MONTH;
      return Money.fromCents(BigInt(Math.round(cents)));
    }
    case "one_off":
      return startMonth.equals(month) ? income.amount : Money.fromCents(0n);
    default:
      return Money.fromCents(0n);
  }
}

/**
 * Equivalência mensal de uma dívida do tipo `recurring` em um dado mês.
 * Para dívidas tradicionais (financing/personal_loan/...) retorna 0 (essas
 * entram na timeline via `payments`, não via projeção da dívida).
 *
 * - `recurring` mensal: `recurringAmountCents` (se ativa naquele mês).
 * - `recurring` semanal: `recurringAmountCents` * 4.33 (se ativa).
 *
 * Considera `startDate`, `expectedEndDate` e `status` para zerar fora do
 * intervalo válido. `status != "active"` zera meses após o fim do compromisso.
 */
export function recurringMonthlyEquivalent(
  debt: DebtEntity,
  month: MonthYear,
  adjustments?: DebtAmountAdjustmentEntity[],
): Money {
  if (debt.kind !== "recurring") return Money.fromCents(0n);
  const startMonth = MonthYear.fromDate(debt.startDate);
  if (month.isBefore(startMonth)) return Money.fromCents(0n);
  if (debt.expectedEndDate) {
    const endMonth = MonthYear.fromDate(debt.expectedEndDate);
    if (month.isAfter(endMonth)) return Money.fromCents(0n);
  } else if (debt.status !== "active") {
    // Sem expectedEndDate explícito mas não ativa => trata como encerrada.
    return Money.fromCents(0n);
  }

  // Adjustments retroativos: precedência override > period > base. Aplicado
  // apenas a recorrentes mensais por enquanto (recorrente semanal mantém a
  // semântica de "amount semanal * 4.33" sem override).
  if (adjustments && debt.recurringFrequency === "monthly") {
    const monthKey = month.toIso();
    const monthAdjustments = adjustments.filter((a) => a.debtId === debt.id);
    const override = monthAdjustments.find(
      (a): a is OverrideAdjustment => a.kind === "override" && a.month === monthKey,
    );
    if (override) return override.amount;
    const matchingPeriods = monthAdjustments
      .filter((a): a is PeriodAdjustment => a.kind === "period" && periodCovers(a, monthKey))
      .sort((a, b) => (a.startMonth < b.startMonth ? 1 : -1));
    const winner = matchingPeriods[0];
    if (winner) return winner.amount;
  }

  const amountCents = debt.recurringAmountCents ?? 0n;
  switch (debt.recurringFrequency) {
    case "monthly":
      return Money.fromCents(amountCents);
    case "weekly": {
      const cents = Number(amountCents) * WEEKS_PER_MONTH;
      return Money.fromCents(BigInt(Math.round(cents)));
    }
    case "annual": {
      // Anual: amortiza linearmente em 12 meses pro modelo macro mensal. O
      // usuário pode usar override no mês de pagamento real pra refletir a
      // saída efetiva (R$X uma vez) em vez do equivalente mensal.
      const cents = Number(amountCents) / 12;
      return Money.fromCents(BigInt(Math.round(cents)));
    }
    default:
      return Money.fromCents(0n);
  }
}

function recurringOutflowForMonth(
  debts: DebtEntity[],
  month: MonthYear,
  adjustments?: DebtAmountAdjustmentEntity[],
): Money {
  return debts.reduce(
    (acc, d) => acc.add(recurringMonthlyEquivalent(d, month, adjustments)),
    Money.fromCents(0n),
  );
}

function paymentsForMonth(payments: DebtPaymentEntity[], month: MonthYear): Money {
  const first = month.firstDay();
  const last = month.lastDay();
  return payments
    .filter((p) => p.paidAt >= first && p.paidAt <= last)
    .reduce((acc, p) => acc.add(p.amount), Money.fromCents(0n));
}

function assetsAtMonthEnd(assets: AssetEntity[], month: MonthYear): Money {
  const last = month.lastDay();
  return assets
    .filter((a) => {
      if (!isAssetActive(a)) return false;
      const start = a.acquiredAt ?? a.createdAt;
      return start <= last;
    })
    .reduce(
      (acc, a) => acc.add(AssetValuationService.computeCurrentValue(a, last)),
      Money.fromCents(0n),
    );
}

/**
 * Estimativa retrógrada do saldo da dívida no fim do mês: parte do
 * `currentBalance` (que é o saldo hoje) e soma de volta todos os pagamentos
 * posteriores ao fim do mês. É uma aproximação (ignora juros que ocorreram
 * entre o mês e hoje), mas é suficiente para visualização macro.
 *
 * Compromissos `recurring` têm `currentBalance` zero (informativo) e
 * portanto não contribuem para `debtsBalance`.
 */
function debtsBalanceAtMonthEnd(
  debts: DebtEntity[],
  payments: DebtPaymentEntity[],
  month: MonthYear,
): Money {
  const last = month.lastDay();
  return debts.reduce((acc, debt) => {
    if (debt.createdAt > last) return acc;
    const futurePayments = payments
      .filter((p) => p.debtId === debt.id && p.paidAt > last)
      .reduce((sum, p) => sum.add(p.amount), Money.fromCents(0n));
    const estimated = debt.currentBalance.add(futurePayments);
    return acc.add(estimated);
  }, Money.fromCents(0n));
}

export class TimelineService {
  /**
   * Constrói a linha do tempo entre `from` e `to` (inclusivos), gerando um
   * `MonthlyDataPoint` por mês na ordem cronológica.
   */
  static buildTimeline(input: BuildTimelineInput): Timeline {
    const points: MonthlyDataPoint[] = [];
    let m = input.from;
    while (m.isAtOrBefore(input.to)) {
      const totalIncome = input.incomes.reduce(
        (acc, inc) => acc.add(incomeMonthlyEquivalent(inc, m)),
        Money.fromCents(0n),
      );
      const installmentPayments = paymentsForMonth(input.payments, m);
      const recurringOutflow = recurringOutflowForMonth(input.debts, m, input.adjustments);
      const totalDebtPayments = installmentPayments.add(recurringOutflow);
      const freeBalance = totalIncome.subtract(totalDebtPayments);
      const assetsTotal = assetsAtMonthEnd(input.assets, m);
      const debtsBalance = debtsBalanceAtMonthEnd(input.debts, input.payments, m);
      const netWorth = assetsTotal.subtract(debtsBalance);
      points.push({
        month: m,
        totalIncome,
        totalDebtPayments,
        freeBalance,
        netWorth,
        assetsTotal,
        debtsBalance,
      });
      m = m.next();
    }
    return { points };
  }
}
