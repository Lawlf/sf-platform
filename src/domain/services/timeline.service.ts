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
import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { AssetValuationService } from "@/domain/services/asset-valuation.service";
import { monthlyDebtService } from "@/domain/services/financial-health.service";
import { effectiveIncomeCentsForMonth } from "@/domain/services/income-settlement.service";
import { WEEKS_PER_MONTH } from "@/domain/services/monthly-frequency";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { isOk } from "@/shared/errors/result";

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

/**
 * Registro de "settlement" de um compromisso recorrente num mês: quando o
 * usuário, no fechar-mês, marcou aquele (compromisso, mês) como convertido em
 * dívida ou cancelado. Apenas `converted_to_debt` afeta a outflow (zera a
 * saída do mês para evitar contar 2x: a saída virou passivo). Chaveado por
 * `debtId` + `monthIso` (`MonthYear.toIso()`), não por `Date`, para casar com
 * a granularidade mensal da timeline.
 */
export interface TimelineSettlement {
  debtId: string;
  monthIso: string;
  status: "converted_to_debt" | "cancelled";
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
  /**
   * Settlements de compromissos recorrentes no fechar-mês. Um
   * `converted_to_debt` em (debtId, mês) zera a saída daquele compromisso
   * naquele mês (o não-pago virou dívida; não conta 2x). Opcional para
   * backward compat com os testes/chamadas existentes.
   */
  settlements?: TimelineSettlement[];
  /**
   * Confirmações de renda no fechar-mês. `not_received` zera a renda daquele
   * mês; `adjusted` substitui pelo valor confirmado; `received`/ausente mantém
   * o valor cadastrado. Opcional para backward compat.
   */
  incomeSettlements?: IncomeSettlementEntity[];
  /**
   * Mês de "agora". Separa passado (pagamentos reais) de presente/futuro
   * (projeção da obrigação de dívida não-recorrente em aberto). Quando ausente,
   * default `to.next()` => nenhum mês da janela projeta, preservando o
   * comportamento legado (só pagamentos + recorrentes). Os callers de produção
   * passam o mês atual para a curva refletir parcelas/faturas que ainda vêm.
   */
  currentMonth?: MonthYear;
}

export function incomeMonthlyEquivalent(
  income: IncomeEntity,
  month: MonthYear,
  incomeSettlements?: IncomeSettlementEntity[],
): Money {
  const startMonth = MonthYear.fromDate(income.startDate);
  if (month.isBefore(startMonth)) return Money.fromCents(0n);
  if (income.endDate) {
    const endMonth = MonthYear.fromDate(income.endDate);
    if (month.isAfter(endMonth)) return Money.fromCents(0n);
  } else if (!income.isActive) {
    // Sem endDate explícito mas inativa => trata como já encerrada.
    return Money.fromCents(0n);
  }

  let baseCents: bigint;
  switch (income.frequency) {
    case "monthly":
      baseCents = income.amount.toCents();
      break;
    case "weekly":
      baseCents = BigInt(Math.round(Number(income.amount.toCents()) * WEEKS_PER_MONTH));
      break;
    case "one_off":
      baseCents = startMonth.equals(month) ? income.amount.toCents() : 0n;
      break;
    default:
      baseCents = 0n;
  }

  if (incomeSettlements && incomeSettlements.length > 0) {
    const monthDate = month.firstDay();
    const target = { year: monthDate.getUTCFullYear(), month: monthDate.getUTCMonth() };
    return Money.fromCents(effectiveIncomeCentsForMonth(income.id, baseCents, target, incomeSettlements));
  }
  return Money.fromCents(baseCents);
}

/**
 * Equivalência mensal de uma dívida do tipo `recurring` em um dado mês.
 * Dívidas tradicionais (financing/personal_loan/...) retornam 0: essas
 * entram na timeline via `payments`, não via projeção da dívida.
 */
export function recurringMonthlyEquivalent(
  debt: DebtEntity,
  month: MonthYear,
  adjustments?: DebtAmountAdjustmentEntity[],
  settlements?: TimelineSettlement[],
): Money {
  if (debt.kind !== "recurring") return Money.fromCents(0n);

  // Anti-double-count: um compromisso convertido em dívida naquele mês deixa
  // de contar como saída (foi substituído pelo passivo criado).
  if (settlements && settlements.length > 0) {
    const monthKey = month.toIso();
    const converted = settlements.some(
      (s) => s.debtId === debt.id && s.monthIso === monthKey && s.status === "converted_to_debt",
    );
    if (converted) return Money.fromCents(0n);
  }

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

/**
 * Obrigação mensal projetada de uma dívida não-recorrente (cartão, financiamento,
 * empréstimo, cheque especial). Reusa `monthlyDebtService` (mesma fonte do
 * snapshot/MCP) pro mês corrente, então o "vai sair / comprometido" bate em todas
 * as telas. Cartão no mês corrente = fatura cheia.
 *
 * Cartão é o caso especial nos meses FUTUROS: a fatura atual é a conta DESTE mês,
 * não se repete. Meses à frente só carregam o compromisso conhecido (parcelas em
 * aberto + juros do rotativo). Financiamento/empréstimo/cheque especial têm
 * parcela/serviço constante, então valem igual em qualquer mês da janela.
 *
 * Só projeta do mês atual em diante; meses passados usam pagamentos reais. O
 * caller faz a guarda anti-double-count (pular se já há pagamento registrado).
 */
export function nonRecurringMonthlyObligation(
  debt: DebtEntity,
  month: MonthYear,
  currentMonth: MonthYear,
): Money {
  if (debt.kind === "recurring") return Money.fromCents(0n);
  if (debt.status !== "active") return Money.fromCents(0n);
  if (month.isBefore(currentMonth)) return Money.fromCents(0n);

  const createdMonth = MonthYear.fromDate(debt.createdAt);
  if (month.isBefore(createdMonth)) return Money.fromCents(0n);

  if (debt.expectedEndDate) {
    const endMonth = MonthYear.fromDate(debt.expectedEndDate);
    if (month.isAfter(endMonth)) return Money.fromCents(0n);
  }

  if (debt.kind === "credit_card" && month.isAfter(currentMonth)) {
    const installmentReais = debt.installmentPurchases
      .filter((p) => p.installmentsRemaining > 0)
      .reduce((sum, p) => sum + p.monthlyValue.toNumber(), 0);
    const revolvingReais =
      (debt.revolvingBalance?.toNumber() ?? 0) * (debt.revolvingMonthlyRate?.toDecimal() ?? 0);
    const total = installmentReais + Math.max(0, revolvingReais);
    if (total <= 0) return Money.fromCents(0n);
    return Money.fromCents(BigInt(Math.round(total * 100)));
  }

  const svc = monthlyDebtService(debt);
  if (!isOk(svc) || svc.value <= 0) return Money.fromCents(0n);
  return Money.fromCents(BigInt(Math.round(svc.value * 100)));
}

/** Origem de uma saída de dívida no mês. */
export type DebtOutflowSource = "payment" | "recurring" | "projection";

/**
 * Uma saída de dívida de um mês, neutra de apresentação. `day` é o dia do mês
 * em que a saída cai (não-clampado; o caller monta a `Date`). `paidAt` só existe
 * quando `source === "payment"`.
 */
export interface MonthlyDebtOutflowItem {
  debtId: string;
  amount: Money;
  day: number;
  source: DebtOutflowSource;
  isClosingPayment: boolean;
  paidAt: Date | null;
}

function debtOutflowDay(debt: DebtEntity): number {
  if (debt.kind === "credit_card") return debt.dueDay;
  if (debt.kind === "recurring") return debt.dueDay ?? 1;
  return debt.startDate.getUTCDate();
}

/**
 * PONTO DE VERDADE da saída de dívida de um mês. Consumido pelo detalhe do mês
 * (linhas de despesa/pagamento), pela carteira (eventos datados) e por qualquer
 * agregado de "vai sair / comprometido". Regras:
 *
 * - Pagamento real registrado no mês é a verdade para dívidas NÃO-recorrentes:
 *   entra como saída (`payment`) e suprime a projeção daquela dívida.
 * - Compromisso recorrente vale sempre o equivalente mensal (`recurring`),
 *   independente de pagamentos — pagamento parcial não "quita" o mês; a baixa
 *   de um recorrente acontece via settlement (fechar-mês), tratada dentro de
 *   `recurringMonthlyEquivalent`. Pagamentos de dívidas recorrentes são
 *   ignorados aqui para não contar a saída duas vezes.
 * - Dívida não-recorrente sem pagamento no mês projeta a obrigação
 *   (`projection`) via `nonRecurringMonthlyObligation`.
 */
export function monthlyDebtOutflow(args: {
  debts: DebtEntity[];
  paymentsThisMonth: DebtPaymentEntity[];
  month: MonthYear;
  currentMonth: MonthYear;
  adjustments?: DebtAmountAdjustmentEntity[] | undefined;
  settlements?: TimelineSettlement[] | undefined;
}): MonthlyDebtOutflowItem[] {
  const { debts, paymentsThisMonth, month, currentMonth, adjustments, settlements } = args;
  const recurringIds = new Set(debts.filter((d) => d.kind === "recurring").map((d) => d.id));
  const paidNonRecurringIds = new Set(
    paymentsThisMonth.filter((p) => !recurringIds.has(p.debtId)).map((p) => p.debtId),
  );

  const items: MonthlyDebtOutflowItem[] = [];

  for (const p of paymentsThisMonth) {
    if (recurringIds.has(p.debtId)) continue;
    items.push({
      debtId: p.debtId,
      amount: p.amount,
      day: p.paidAt.getUTCDate(),
      source: "payment",
      isClosingPayment: p.isClosingPayment,
      paidAt: p.paidAt,
    });
  }

  for (const debt of debts) {
    if (debt.deletedAt !== null) continue;
    if (debt.kind === "recurring") {
      const amount = recurringMonthlyEquivalent(debt, month, adjustments, settlements);
      if (amount.toCents() <= 0n) continue;
      items.push({
        debtId: debt.id,
        amount,
        day: debtOutflowDay(debt),
        source: "recurring",
        isClosingPayment: false,
        paidAt: null,
      });
      continue;
    }
    if (paidNonRecurringIds.has(debt.id)) continue;
    const obligation = nonRecurringMonthlyObligation(debt, month, currentMonth);
    if (obligation.toCents() <= 0n) continue;
    items.push({
      debtId: debt.id,
      amount: obligation,
      day: debtOutflowDay(debt),
      source: "projection",
      isClosingPayment: false,
      paidAt: null,
    });
  }

  return items;
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
  static buildTimeline(input: BuildTimelineInput): Timeline {
    const points: MonthlyDataPoint[] = [];
    const currentMonth = input.currentMonth ?? input.to.next();
    let m = input.from;
    while (m.isAtOrBefore(input.to)) {
      const totalIncome = input.incomes.reduce(
        (acc, inc) => acc.add(incomeMonthlyEquivalent(inc, m, input.incomeSettlements)),
        Money.fromCents(0n),
      );
      const paymentsThisMonth = input.payments.filter((p) => MonthYear.fromDate(p.paidAt).equals(m));
      const totalDebtPayments = monthlyDebtOutflow({
        debts: input.debts,
        paymentsThisMonth,
        month: m,
        currentMonth,
        adjustments: input.adjustments,
        settlements: input.settlements,
      }).reduce((acc, it) => acc.add(it.amount), Money.fromCents(0n));
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
