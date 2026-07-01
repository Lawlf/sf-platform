"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Calendar, Repeat, Search, TrendingUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";
import { formatCents } from "@/shared/format/money-format";

import { fetchIncomes, type IncomeListItemPayload } from "../../_actions/income-queries";
import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import { queryKeys } from "../../_lib/query-keys";

import { DeleteIncomeButton } from "./delete-income-button";
import { IncomeOverflowMenu } from "./income-overflow-menu.client";
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

function consignadoHolerite(
  income: IncomeListItemPayload,
): { deductionFormatted: string; sobraFormatted: string } | null {
  if (!income.consignadoDeductionCents) return null;
  const deductionCents = BigInt(income.consignadoDeductionCents);
  if (deductionCents <= 0n) return null;
  const amountCents = BigInt(income.amount.cents);
  const sobraCents = amountCents - deductionCents > 0n ? amountCents - deductionCents : 0n;
  return {
    deductionFormatted: formatCents(deductionCents),
    sobraFormatted: formatCents(sobraCents),
  };
}

export function RendaListClient() {
  const { data: incomes } = useSuspenseQuery({
    queryKey: queryKeys.incomes,
    queryFn: () => fetchIncomes(),
  });

  const [search, setSearch] = useState("");

  const filteredIncomes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return incomes;
    return incomes.filter((i) => i.label.toLowerCase().includes(term));
  }, [incomes, search]);

  const active = filteredIncomes.filter((i) => i.isActive);
  const archived = filteredIncomes.filter((i) => !i.isActive);

  return (
    <>
      {incomes.length > 1 ? (
        <label className="flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2">
          <Search
            size={16}
            strokeWidth={2}
            className="shrink-0 text-[color:var(--text-muted)]"
            aria-hidden
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar renda"
            className="w-full bg-transparent text-[0.8125rem] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
          />
        </label>
      ) : null}

      {search.trim() && filteredIncomes.length === 0 ? (
        <p className="px-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Nada encontrado pra &quot;{search}&quot;.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Ativas ({active.length})
            </h2>
            {active.length === 0 ? (
              search.trim() ? null : (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-4 py-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]">
                    <TrendingUp size={22} strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    Ainda não tem renda cadastrada. Coloque o que entra todo mês pra saber se você
                    fecha o mês.
                  </p>
                  <Link
                    href={"/app/renda/nova" as Route}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-2.5 text-[0.8125rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105"
                  >
                    <TrendingUp size={15} strokeWidth={2.25} aria-hidden />
                    Adicionar renda
                  </Link>
                </div>
              )
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {active.map((income) => {
                  const Icon = FREQUENCY_ICON[income.frequency] ?? Repeat;
                  return (
                    <div
                      key={income.id}
                      className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
                    >
                      <Link
                        href={`/app/renda/${income.id}` as Route}
                        className="focus-ring flex min-w-0 flex-1 items-center gap-3"
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
                          {(() => {
                            const holerite = consignadoHolerite(income);
                            if (!holerite) return null;
                            return (
                              <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
                                Consignado:{" "}
                                <HideableValue>-{holerite.deductionFormatted}</HideableValue> ·
                                sobram <HideableValue>{holerite.sobraFormatted}</HideableValue>
                              </div>
                            );
                          })()}
                        </div>
                      </Link>
                      <IncomeOverflowMenu incomeId={income.id} label={income.label} />
                    </div>
                  );
                })}
              </div>
            )}
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
      )}
    </>
  );
}
