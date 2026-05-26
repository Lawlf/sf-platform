import { Banknote, CreditCard, Home, Repeat, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import type { DebtEntity, DebtKind, DebtStatus } from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";

const KIND_LABEL: Record<DebtKind, string> = {
  financing: "Financiamento",
  personal_loan: "Empréstimo ou crediário",
  credit_card: "Cartão de crédito",
  overdraft: "Cheque especial",
  recurring: "Compromisso recorrente",
};

const STATUS_LABEL: Record<DebtStatus, string> = {
  active: "Ativa",
  paid_off: "Quitada",
  written_off: "Baixada",
};

const FREQUENCY_LABEL = {
  monthly: "mês",
  weekly: "semana",
  annual: "ano",
} as const;

const FREQUENCY_NAME = {
  monthly: "Mensal",
  weekly: "Semanal",
  annual: "Anual",
} as const;

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  housing: "Moradia",
  utilities: "Contas de casa",
  food: "Alimentação",
  transport: "Transporte",
  health: "Saúde",
  education: "Educação",
  leisure: "Lazer",
  subscription: "Assinaturas",
  other: "Outros",
};

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function kindIcon(kind: DebtKind): ReactNode {
  if (kind === "credit_card") return <CreditCard size={20} strokeWidth={1.5} aria-hidden />;
  if (kind === "financing") return <Home size={20} strokeWidth={1.5} aria-hidden />;
  if (kind === "overdraft") return <Wallet size={20} strokeWidth={1.5} aria-hidden />;
  if (kind === "recurring") return <Repeat size={20} strokeWidth={1.5} aria-hidden />;
  return <Banknote size={20} strokeWidth={1.5} aria-hidden />;
}

function statusBadgeClass(status: DebtStatus): string {
  if (status === "active") return "bg-white/20 text-white";
  if (status === "paid_off") return "bg-white/30 text-white";
  return "bg-white/15 text-white/90";
}

function buildHeaderStats(
  debt: DebtEntity,
): { label: string; value: string; isCurrency?: boolean }[] {
  if (debt.kind === "recurring") {
    const freqLabel = FREQUENCY_LABEL[debt.recurringFrequency];
    const categoryLabel = EXPENSE_CATEGORY_LABEL[debt.expenseCategory ?? "other"] ?? "Outros";
    return [
      {
        label: `Por ${freqLabel}`,
        value: Money.fromCents(debt.recurringAmountCents).format(),
        isCurrency: true,
      },
      { label: "Frequência", value: FREQUENCY_NAME[debt.recurringFrequency] },
      { label: "Categoria", value: categoryLabel },
      { label: "Início", value: DATE_FMT.format(debt.startDate) },
    ];
  }
  const secondary =
    debt.kind === "credit_card"
      ? { label: "Limite", value: debt.creditLimit.format(), isCurrency: true }
      : {
          label: "Previsto",
          value: debt.expectedEndDate ? DATE_FMT.format(debt.expectedEndDate) : "Sem previsão",
        };
  return [
    { label: "Dívida atual", value: debt.currentBalance.format(), isCurrency: true },
    { label: "Valor original", value: debt.originalPrincipal.format(), isCurrency: true },
    { label: "Início", value: DATE_FMT.format(debt.startDate) },
    secondary,
  ];
}

interface Props {
  debt: DebtEntity;
}

export function DebtHeader({ debt }: Props) {
  const headerStats = buildHeaderStats(debt);
  return (
    <section className="glass-tier-1 relative overflow-hidden p-[22px]">
      <div
        className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-white/[0.12]"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide opacity-95">
            {KIND_LABEL[debt.kind]}
          </div>
          <h1
            className="mt-1 text-[1.5rem] font-extrabold leading-tight"
            style={{ letterSpacing: "-0.4px" }}
          >
            {debt.label}
          </h1>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${statusBadgeClass(debt.status)}`}
          >
            {STATUS_LABEL[debt.status]}
          </span>
        </div>
        <span className="opacity-80">{kindIcon(debt.kind)}</span>
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-3 text-sm">
        {headerStats.map((s) => (
          <div key={s.label}>
            <div className="text-[0.625rem] font-semibold uppercase tracking-wide opacity-80">
              {s.label}
            </div>
            <div className="mt-0.5 font-bold tabular-nums">
              {s.isCurrency ? <HideableValue>{s.value}</HideableValue> : s.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
