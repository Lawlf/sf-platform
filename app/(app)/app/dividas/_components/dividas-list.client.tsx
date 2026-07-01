"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Banknote,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Home,
  Repeat,
  Search,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import type { DebtKind } from "@/domain/entities/debt.entity";

import { fetchDebts, type DebtStatusFilter } from "../../_actions/debt-queries";
import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import { queryKeys } from "../../_lib/query-keys";

const KIND_LABEL: Record<DebtKind, string> = {
  financing: "Financiamento",
  personal_loan: "Empréstimo ou crediário",
  credit_card: "Cartão de crédito",
  overdraft: "Cheque especial",
  recurring: "Conta fixa do mês",
};

const KIND_ICON: Record<DebtKind, typeof Home> = {
  financing: Home,
  personal_loan: Banknote,
  credit_card: CreditCard,
  overdraft: Wallet,
  recurring: Repeat,
};

const FREQUENCY_LABEL = {
  monthly: "mês",
  weekly: "semana",
  annual: "ano",
} as const;

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  paid_off: "Quitada",
  written_off: "Fora do seu mês",
};

const FILTERS: { id: DebtStatusFilter; label: string }[] = [
  { id: "active", label: "Ativas" },
  { id: "written_off", label: "Fora do mês" },
  { id: "paid_off", label: "Quitadas" },
  { id: "all", label: "Todas" },
];

interface StatusTone {
  bg: string;
  text: string;
}

const DEFAULT_STATUS_TONE: StatusTone = {
  bg: "var(--color-brand-500)/[0.14]",
  text: "var(--color-brand-800)",
};

const STATUS_TONE: Record<string, StatusTone> = {
  active: { bg: "var(--color-brand-500)/[0.14]", text: "var(--color-brand-800)" },
  paid_off: { bg: "var(--semantic-positive)/[0.14]", text: "var(--semantic-positive)" },
  written_off: { bg: "var(--surface-3)", text: "var(--text-muted)" },
};

export function DividasListClient({ statusFilter }: { statusFilter: DebtStatusFilter }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { data: debts } = useSuspenseQuery({
    queryKey: queryKeys.debts(statusFilter),
    queryFn: () => fetchDebts({ status: statusFilter }),
  });

  const filteredDebts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return debts;
    return debts.filter((d) => d.label.toLowerCase().includes(term));
  }, [debts, search]);

  function setFilter(id: DebtStatusFilter) {
    const href = id === "active" ? "/app/dividas" : `/app/dividas?status=${id}`;
    setFilterSheetOpen(false);
    startTransition(() => {
      router.push(href as Route);
    });
  }

  const currentFilterLabel = FILTERS.find((f) => f.id === statusFilter)?.label ?? "Ativas";

  const controls = (
    <div className="flex items-center gap-2">
      <label className="flex flex-1 items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2">
        <Search size={16} strokeWidth={2} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar dívida"
          className="w-full bg-transparent text-[0.8125rem] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
        />
      </label>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className="focus-ring flex shrink-0 items-center gap-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-1)]"
        >
          {currentFilterLabel}
          <ChevronDown size={14} strokeWidth={2} aria-hidden />
        </button>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="p-4">
            <SheetTitle>Filtrar por status</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-[color:var(--border-soft)] border-t border-[color:var(--border-soft)]">
            {FILTERS.map((f) => {
              const active = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
                >
                  <span className="flex-1 text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                    {f.label}
                  </span>
                  {active ? (
                    <Check size={18} strokeWidth={2.5} className="text-[color:var(--color-brand-700)]" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  if (debts.length === 0) {
    // Fora do seu mês vazio: empty-state honesto, sem CTA (nunca convidamos a
    // marcar uma dívida).
    if (statusFilter === "written_off") {
      return (
        <div className="flex flex-col gap-3">
          {controls}
          <section className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[color:var(--border-soft)] px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--surface-3)] text-[color:var(--text-muted)]">
              <Wallet size={22} strokeWidth={1.5} aria-hidden />
            </span>
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">
              Nenhuma dívida fora do seu mês.
            </h3>
          </section>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        {controls}
        <section className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Wallet size={22} strokeWidth={1.5} aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">
              Nenhuma dívida {statusFilter === "active" ? "ativa" : "encontrada"}
            </h3>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Cadastre uma nova pra acompanhar saldo, parcelas e simular cenários.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {controls}

      {filteredDebts.length === 0 ? (
        <p className="px-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Nada encontrado pra &quot;{search}&quot;.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filteredDebts.map((d) => {
            const Icon = KIND_ICON[d.kind] ?? Wallet;
            const tone: StatusTone = STATUS_TONE[d.status] ?? DEFAULT_STATUS_TONE;
            const isRecurring = d.kind === "recurring" && d.recurringAmount && d.recurringFrequency;
            const amountValue = isRecurring
              ? d.recurringAmount!.formatted
              : d.status === "active"
                ? d.currentBalance.formatted
                : d.originalPrincipal.formatted;
            const amountSuffix =
              isRecurring && d.recurringFrequency ? ` / ${FREQUENCY_LABEL[d.recurringFrequency]}` : "";
            // "falta" deixa claro que o número é o saldo que ainda resta, não o valor
            // original nem a parcela.
            const amountPrefix = !isRecurring && d.status === "active" ? "falta " : "";
            return (
              <Link
                key={d.id}
                href={`/app/dividas/${d.id}` as Route}
                className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                      {d.label}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide"
                      style={{
                        background: `color-mix(in srgb, ${tone.text} 14%, transparent)`,
                        color: tone.text,
                      }}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2 text-[0.75rem]">
                    <span className="text-[color:var(--text-muted)]">{KIND_LABEL[d.kind] ?? d.kind}</span>
                    <span className="text-[color:var(--text-muted)]">·</span>
                    <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">
                      {amountPrefix}
                      <HideableValue>{amountValue}</HideableValue>
                      {amountSuffix}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  strokeWidth={2}
                  className="text-[color:var(--color-brand-800)]"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
