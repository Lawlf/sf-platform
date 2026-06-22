"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Calendar, Pencil, Repeat, TrendingUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { fetchIncomes } from "../../_actions/income-queries";
import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import { queryKeys } from "../../_lib/query-keys";

import { ArchiveIncomeButton } from "./archive-income-button";
import { DeleteIncomeButton } from "./delete-income-button";
import { ReactivateIncomeButton } from "./reactivate-income-button";

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  one_off: "Pontual",
};

const FREQUENCY_ICON: Record<string, typeof Repeat> = {
  monthly: Calendar,
  weekly: Repeat,
  one_off: TrendingUp,
};

export function RendaListClient() {
  const { data: incomes } = useSuspenseQuery({
    queryKey: queryKeys.incomes,
    queryFn: () => fetchIncomes(),
  });

  const active = incomes.filter((i) => i.isActive);
  const archived = incomes.filter((i) => !i.isActive);

  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Ativas ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-4 py-6 text-center text-sm text-[color:var(--text-secondary)]">
            Nenhuma renda ativa. Adicione sua primeira fonte acima.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {active.map((income) => {
              const Icon = FREQUENCY_ICON[income.frequency] ?? Repeat;
              return (
                <article
                  key={income.id}
                  className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]">
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                      {income.label}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2 text-[0.75rem]">
                      <span className="font-semibold text-[color:var(--semantic-positive)]">
                        <HideableValue>{income.amount.formatted}</HideableValue>
                      </span>
                      <span className="text-[color:var(--text-muted)]">·</span>
                      <span className="text-[color:var(--text-muted)]">
                        {FREQUENCY_LABELS[income.frequency] ?? income.frequency}
                      </span>
                      {income.isEstimated ? (
                        <>
                          <span className="text-[color:var(--text-muted)]">·</span>
                          <SimpleTooltip label="Valor varia mês a mês. Tratamos como média, não receita garantida.">
                            <span className="rounded-full bg-[color:var(--surface-3)] px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                              estimada
                            </span>
                          </SimpleTooltip>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <SimpleTooltip label="Editar">
                      <Link
                        href={`/app/renda/${income.id}/editar` as Route}
                        aria-label={`Editar ${income.label}`}
                        className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--color-brand-800)]"
                      >
                        <Pencil size={15} strokeWidth={2} aria-hidden />
                      </Link>
                    </SimpleTooltip>
                    <ArchiveIncomeButton incomeId={income.id} label={income.label} />
                    <DeleteIncomeButton incomeId={income.id} label={income.label} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {active.length > 0 ? (
          <Link
            href={"/app/linha-do-tempo" as Route}
            className="focus-ring mt-1 flex items-center justify-between rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-2)] p-4"
          >
            <span className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
              Ver como seu mês fecha com essa renda
            </span>
            <TrendingUp size={16} strokeWidth={2.25} className="text-[color:var(--color-brand-800)]" aria-hidden />
          </Link>
        ) : null}
      </section>

      {archived.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Arquivadas ({archived.length})
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {archived.map((income) => {
              const Icon = FREQUENCY_ICON[income.frequency] ?? Repeat;
              return (
                <article
                  key={income.id}
                  className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] p-4 opacity-70 backdrop-blur-xl"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-3)] text-[color:var(--text-muted)]">
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                      {income.label}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2 text-[0.75rem]">
                      <span className="font-semibold text-[color:var(--text-secondary)]">
                        <HideableValue>{income.amount.formatted}</HideableValue>
                      </span>
                      <span className="text-[color:var(--text-muted)]">·</span>
                      <span className="text-[color:var(--text-muted)]">
                        {FREQUENCY_LABELS[income.frequency] ?? income.frequency}
                      </span>
                      {income.isEstimated ? (
                        <>
                          <span className="text-[color:var(--text-muted)]">·</span>
                          <span className="rounded-full bg-[color:var(--surface-3)] px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                            estimada
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ReactivateIncomeButton incomeId={income.id} label={income.label} />
                    <DeleteIncomeButton incomeId={income.id} label={income.label} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
