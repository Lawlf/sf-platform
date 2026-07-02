"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock,
  Eye,
  EyeOff,
  ListFilter,
  Plus,
  Search,
  Tag,
  Trash2,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { activeCategories } from "@/domain/categories/resolve-categories";
import { wizardInputClass } from "@/ui/wizard-field";

import type { CategoryCatalog } from "../../_actions/category-queries";
import { categoryIcon } from "../../_components/category-icons";
import { queryKeys } from "../../_lib/query-keys";
import { setSelectionBarActive } from "../../_lib/selection-bar";
import { createCashAccount } from "../../linha-do-tempo/_actions/create-cash-account.action";
import {
  listCashAccounts,
  type CashAccountOption,
} from "../../linha-do-tempo/_actions/list-cash-accounts.action";
import { bulkCategorizeAction } from "../_actions/bulk-categorize.action";
import { bulkDeleteAction } from "../_actions/bulk-delete.action";
import { bulkExcludeAction } from "../_actions/bulk-exclude.action";
import { moveTransactionsAction } from "../_actions/move-transactions.action";
import type { SerializedTxn } from "../_actions/transactions-list-queries";

const NO_CATEGORY_VALUE = "__none__";
const ALL_VALUE = "__all__";

const DAY_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  weekday: "short",
  timeZone: "UTC",
});

function monthYears(currentIso: string): number[] {
  const y = Number(currentIso.slice(0, 4));
  return [y - 2, y - 1, y, y + 1];
}

function shiftMonthIso(iso: string, delta: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const PERIOD_PRESETS = [
  { months: 1, label: "Último mês" },
  { months: 3, label: "3 meses" },
  { months: 6, label: "6 meses" },
  { months: 12, label: "12 meses" },
  { months: 24, label: "24 meses" },
  { months: 60, label: "Tudo" },
];

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MONTH_YEAR_FMT = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatSigned(cents: bigint, currency: string): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const fmt = (Number(abs) / 100).toLocaleString("pt-BR", { style: "currency", currency });
  return negative ? `-${fmt}` : fmt;
}

function groupByMonth(items: SerializedTxn[]): { month: string; entries: SerializedTxn[] }[] {
  const map = new Map<string, SerializedTxn[]>();
  for (const t of items) {
    const k = t.occurredAtIso.slice(0, 7);
    const list = map.get(k) ?? [];
    list.push(t);
    map.set(k, list);
  }
  return Array.from(map.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((month) => ({
      month,
      entries: (map.get(month) ?? [])
        .slice()
        .sort((a, b) => b.occurredAtIso.localeCompare(a.occurredAtIso)),
    }));
}

function chipClass(active: boolean): string {
  return `focus-ring inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
    active
      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)] text-white shadow-sm"
      : "border-[color:var(--border-strong)] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)] hover:border-[color:var(--color-brand-500)]/50 hover:text-[color:var(--text-primary)]"
  }`;
}

interface Props {
  transactions: SerializedTxn[];
  catalog: CategoryCatalog | null;
  monthIso: string;
  monthLabel: string;
  focusedDay: string | null;
  /** Modo "categoria ao longo dos meses": lista agrupada por mês, sem picker/chips. */
  categoryHistory?: {
    categoryKey: string;
    categoryLabel: string;
    periodTotalFormatted: string;
    fromMonth: string;
    toMonth: string;
    nowMonthIso: string;
  };
}

export function TransactionsView({
  transactions,
  catalog,
  monthIso,
  monthLabel,
  focusedDay,
  categoryHistory,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<SerializedTxn[]>(transactions);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_VALUE);
  const [monthSheet, setMonthSheet] = useState(false);
  const [moreCats, setMoreCats] = useState(false);
  const [periodSheet, setPeriodSheet] = useState(false);
  const [customRange, setCustomRange] = useState(false);
  const [activeYear, setActiveYear] = useState(() => Number(monthIso.slice(0, 4)));
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSheet, setBulkSheet] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [excludeSheet, setExcludeSheet] = useState(false);
  const [optionsSheet, setOptionsSheet] = useState(false);
  const [moveSheet, setMoveSheet] = useState(false);
  const [createAccountSheet, setCreateAccountSheet] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountIsReserve, setNewAccountIsReserve] = useState(false);
  const [accounts, setAccounts] = useState<CashAccountOption[] | null>(null);
  const [bulkPending, startBulk] = useTransition();

  useEffect(() => {
    setSelectionBarActive(selectMode);
    return () => setSelectionBarActive(false);
  }, [selectMode]);

  // Deep-link de "movimentações recentes": vai direto pro detalhe do
  // lançamento clicado, se ele estiver no período carregado.
  useEffect(() => {
    const txnId = searchParams.get("txn");
    if (!txnId) return;
    const found = transactions.find((t) => t.id === txnId);
    if (found) router.push(`/app/lancamentos/${txnId}` as Route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let on = true;
    void listCashAccounts().then((r) => {
      if (on) setAccounts(r);
    });
    return () => {
      on = false;
    };
  }, []);

  const presentCategories = useMemo(() => {
    const map = new Map<string, string>();
    const counts = new Map<string, number>();
    for (const t of items) {
      if (t.categoryKey && t.categoryLabel) {
        map.set(t.categoryKey, t.categoryLabel);
        counts.set(t.categoryKey, (counts.get(t.categoryKey) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => (counts.get(b.key) ?? 0) - (counts.get(a.key) ?? 0));
  }, [items]);

  const noneCount = useMemo(() => items.filter((t) => t.categoryKey === null).length, [items]);
  const sortedCategories = presentCategories;
  const topCategories = sortedCategories.slice(0, 3);
  const topKeys = new Set(topCategories.map((c) => c.key));
  const extraActive =
    categoryFilter !== ALL_VALUE && categoryFilter !== NO_CATEGORY_VALUE && !topKeys.has(categoryFilter)
      ? (sortedCategories.find((c) => c.key === categoryFilter) ?? null)
      : null;
  const hasMoreCategories = sortedCategories.length > 3 || noneCount > 0;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((t) => {
      if (term && !t.description.toLowerCase().includes(term)) return false;
      if (categoryFilter === ALL_VALUE) return true;
      if (categoryFilter === NO_CATEGORY_VALUE) return t.categoryKey === null;
      return t.categoryKey === categoryFilter;
    });
  }, [items, search, categoryFilter]);

  const days = useMemo(() => groupByDay(filtered), [filtered]);

  const monthSummary = useMemo(() => {
    let netCents = 0n;
    for (const t of items) {
      if (t.excludedFromTotals) continue;
      const cents = BigInt(t.amountCents);
      netCents += t.direction === "in" ? cents : -cents;
    }
    return { netCents, count: items.length, currency: items[0]?.currency ?? "BRL" };
  }, [items]);

  function invalidateProjection() {
    void queryClient.invalidateQueries({ queryKey: ["timeline"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance });
    void queryClient.invalidateQueries({ queryKey: queryKeys.netWorth });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot });
    void queryClient.invalidateQueries({ queryKey: queryKeys.positionDetail });
  }

  const bulkCategories = useMemo(() => {
    const expense = activeCategories(catalog?.expense ?? []);
    const inflow = activeCategories(catalog?.inflow ?? []);
    const dirs = new Set<string>();
    for (const t of items) if (selectedIds.has(t.id)) dirs.add(t.direction);
    // Mesma direção (caso comum): mostra só o domínio certo, igual ao editar um.
    if (dirs.size === 1) return dirs.has("in") ? inflow : expense;
    // Seleção mista (raro): junta os dois, sem duplicar.
    const seen = new Set<string>();
    const out: { key: string; label: string; icon: string }[] = [];
    for (const c of [...expense, ...inflow]) {
      if (!seen.has(c.key)) {
        seen.add(c.key);
        out.push(c);
      }
    }
    return out;
  }, [catalog, items, selectedIds]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function applyBulk(categoryKey: string | null) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    startBulk(async () => {
      const r = await bulkCategorizeAction({ transactionIds: ids, category: categoryKey });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      const label =
        categoryKey === null ? null : (bulkCategories.find((c) => c.key === categoryKey)?.label ?? null);
      const idSet = new Set(ids);
      setItems((prev) =>
        prev.map((t) =>
          idSet.has(t.id) ? { ...t, categoryKey, categoryLabel: label } : t,
        ),
      );
      toast.success(`${ids.length} categorizado${ids.length > 1 ? "s" : ""}.`);
      invalidateProjection();
      setBulkSheet(false);
      exitSelect();
    });
  }

  const selectedAllExcluded =
    selectedIds.size > 0 &&
    items.filter((t) => selectedIds.has(t.id)).every((t) => t.excludedFromTotals);

  const baseAccount = accounts?.find((a) => a.isBase) ?? null;
  const selectedAccountIds = new Set(
    items.filter((t) => selectedIds.has(t.id)).map((t) => t.accountId),
  );
  // Esconde um destino só quando TODOS os selecionados já estão nele (mover pra
  // onde já está = no-op). Seleção em lugares diferentes mostra tudo.
  const allSelectedIn = (id: string) => selectedAccountIds.size === 1 && selectedAccountIds.has(id);
  const reserveAccounts = (accounts ?? []).filter(
    (a) => a.isReserve && !a.isBase && !allSelectedIn(a.id),
  );
  const contaAccounts = (accounts ?? []).filter(
    (a) => !a.isReserve && !a.isBase && !allSelectedIn(a.id),
  );
  const showBackToDaily = baseAccount !== null && !allSelectedIn(baseAccount.id);
  const accountById = new Map((accounts ?? []).map((a) => [a.id, a] as const));
  const originLabel = (() => {
    if (selectedAccountIds.size > 1) return `Saindo de ${selectedAccountIds.size} lugares diferentes`;
    const only = [...selectedAccountIds][0];
    if (!only) return null;
    const a = accountById.get(only);
    if (!a) return null;
    return a.isBase ? "Saindo da Carteira" : `Saindo de ${a.label}`;
  })();

  function applyBulkExclude(excluded: boolean) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    startBulk(async () => {
      const r = await bulkExcludeAction({ transactionIds: ids, excluded });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      const idSet = new Set(ids);
      setItems((prev) =>
        prev.map((t) => (idSet.has(t.id) ? { ...t, excludedFromTotals: excluded } : t)),
      );
      toast.success(excluded ? "Tirado do mês." : "Voltou a contar.");
      invalidateProjection();
      setExcludeSheet(false);
      exitSelect();
    });
  }

  function applyMove(targetAccountId: string, label: string) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    startBulk(async () => {
      const r = await moveTransactionsAction({ transactionIds: ids, targetAccountId });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success(`Movido pra ${label}.`);
      invalidateProjection();
      setMoveSheet(false);
      exitSelect();
    });
  }

  function createAndMove() {
    const name = newAccountName.trim();
    if (name.length === 0) return;
    startBulk(async () => {
      const created = await createCashAccount({ label: name, isReserve: newAccountIsReserve });
      if (!created.ok) {
        toast.error(created.message);
        return;
      }
      setAccounts((prev) => [...(prev ?? []), created.data.account]);
      const ids = [...selectedIds];
      const r = await moveTransactionsAction({
        transactionIds: ids,
        targetAccountId: created.data.account.id,
      });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success(`Guardado em ${created.data.account.label}.`);
      invalidateProjection();
      setNewAccountName("");
      setNewAccountIsReserve(false);
      setCreateAccountSheet(false);
      exitSelect();
    });
  }

  function applyBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    startBulk(async () => {
      const r = await bulkDeleteAction({ transactionIds: ids });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      const idSet = new Set(ids);
      setItems((prev) => prev.filter((t) => !idSet.has(t.id)));
      toast.success(`${ids.length} apagado${ids.length > 1 ? "s" : ""}.`);
      invalidateProjection();
      setDeleteSheet(false);
      exitSelect();
    });
  }

  if (categoryHistory) {
    const ch = categoryHistory;
    const months = groupByMonth(items);
    const goRange = (from: string, to: string) =>
      router.push(
        `/app/lancamentos?category=${encodeURIComponent(ch.categoryKey)}&from=${from}&to=${to}` as Route,
      );
    const activePreset = PERIOD_PRESETS.find(
      (p) =>
        ch.toMonth === ch.nowMonthIso &&
        ch.fromMonth === shiftMonthIso(ch.nowMonthIso, -(p.months - 1)),
    );
    const periodLabel = activePreset?.label ?? "Período personalizado";
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <div className="min-w-0">
            <div className="truncate text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
              {ch.categoryLabel}
            </div>
            <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">No período</div>
          </div>
          <span className="shrink-0 text-[1rem] font-extrabold tabular-nums text-[color:var(--text-primary)]">
            {ch.periodTotalFormatted}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setCustomRange(!activePreset);
            setPeriodSheet(true);
          }}
          className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-full border-[1.5px] border-[color:var(--border-strong)] px-3.5 py-1.5 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--color-brand-500)]/50 hover:text-[color:var(--text-primary)]"
        >
          <CalendarRange size={14} strokeWidth={2} aria-hidden />
          {periodLabel}
          <ChevronDown size={14} strokeWidth={2} aria-hidden className="text-[color:var(--text-muted)]" />
        </button>

        <Sheet open={periodSheet} onOpenChange={setPeriodSheet}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto px-6 pb-8 pt-3">
            <div
              className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
              aria-hidden
            />
            <SheetHeader>
              <SheetTitle>Período</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-wrap gap-2">
              {PERIOD_PRESETS.map((p) => (
                <button
                  key={p.months}
                  type="button"
                  onClick={() => {
                    setPeriodSheet(false);
                    goRange(shiftMonthIso(ch.nowMonthIso, -(p.months - 1)), ch.nowMonthIso);
                  }}
                  className={chipClass(activePreset?.months === p.months)}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomRange((v) => !v)}
                className={chipClass(customRange && !activePreset)}
              >
                Personalizado
              </button>
            </div>
            {customRange ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.75rem] text-[color:var(--text-secondary)]">
                <label className="flex items-center gap-1.5">
                  De
                  <input
                    type="month"
                    value={ch.fromMonth}
                    max={ch.toMonth}
                    onChange={(e) => e.target.value && goRange(e.target.value, ch.toMonth)}
                    className="rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-1)] px-2 py-1 text-[0.8125rem] text-[color:var(--text-primary)]"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  até
                  <input
                    type="month"
                    value={ch.toMonth}
                    min={ch.fromMonth}
                    onChange={(e) => e.target.value && goRange(ch.fromMonth, e.target.value)}
                    className="rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-1)] px-2 py-1 text-[0.8125rem] text-[color:var(--text-primary)]"
                  />
                </label>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>

        {months.length === 0 ? (
          <p className="py-10 text-center text-[0.8125rem] text-[color:var(--text-muted)]">
            Nenhum lançamento dessa categoria nos últimos 12 meses.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {months.map(({ month, entries }) => (
              <section key={month} className="flex flex-col gap-2">
                <header className="px-1">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
                    {MONTH_YEAR_FMT.format(new Date(`${month}-01T00:00:00Z`))}
                  </span>
                </header>
                <div className="flex flex-col gap-2">
                  {entries.map((t) => (
                    <TxnRow
                      key={t.id}
                      txn={t}
                      href={`/app/lancamentos/${t.id}` as Route}
                      account={accountById.get(t.accountId ?? "") ?? null}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              {focusedDay ? "Saldo do dia" : "Saldo do mês"}
            </div>
            <div className="mt-1 text-[2.25rem] font-extrabold leading-none text-[color:var(--text-primary)]">
              {formatSigned(monthSummary.netCents, monthSummary.currency)}
            </div>
            <div className="mt-1.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
              {monthSummary.count} {monthSummary.count === 1 ? "lançamento" : "lançamentos"}
            </div>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
            <Wallet size={20} strokeWidth={2} aria-hidden />
          </span>
        </div>
      </section>

      {focusedDay ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            {DAY_FMT.format(new Date(`${focusedDay}T00:00:00Z`)).replace(",", "")}
          </span>
          <Link
            href={`/app/lancamentos?month=${monthIso}` as Route}
            className="focus-ring text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
          >
            Ver o mês todo
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1">
          <Link
            href={`/app/lancamentos?month=${shiftMonthIso(monthIso, -1)}` as Route}
            aria-label="Mês anterior"
            className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setMonthSheet(true)}
            className="focus-ring flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.9375rem] font-bold capitalize text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            {monthLabel}
            <ChevronDown size={16} strokeWidth={2} aria-hidden className="text-[color:var(--text-muted)]" />
          </button>
          <Link
            href={`/app/lancamentos?month=${shiftMonthIso(monthIso, 1)}` as Route}
            aria-label="Próximo mês"
            className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <ChevronRight size={20} strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search
            size={15}
            strokeWidth={2}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pela descrição"
            className={`${wizardInputClass} pl-9`}
          />
        </div>
        {sortedCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCategoryFilter(ALL_VALUE)} className={chipClass(categoryFilter === ALL_VALUE)}>
              Todas
            </button>
            {topCategories.map((c) => (
              <button key={c.key} type="button" onClick={() => setCategoryFilter(c.key)} className={chipClass(categoryFilter === c.key)}>
                {c.label}
              </button>
            ))}
            {extraActive ? (
              <button type="button" onClick={() => setCategoryFilter(extraActive.key)} className={chipClass(true)}>
                {extraActive.label}
              </button>
            ) : null}
            {categoryFilter === NO_CATEGORY_VALUE ? (
              <button type="button" onClick={() => setCategoryFilter(NO_CATEGORY_VALUE)} className={chipClass(true)}>
                Sem categoria
              </button>
            ) : null}
            {hasMoreCategories ? (
              <button type="button" onClick={() => setMoreCats(true)} className={chipClass(false)}>
                <ListFilter size={14} strokeWidth={2} aria-hidden />
                Mais
              </button>
            ) : null}
          </div>
        ) : null}
        {categoryFilter !== ALL_VALUE && categoryFilter !== NO_CATEGORY_VALUE ? (
          <Link
            href={`/app/lancamentos?category=${encodeURIComponent(categoryFilter)}` as Route}
            className="focus-ring mt-1 w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
          >
            Ver em todos os meses
          </Link>
        ) : null}
      </div>

      {items.length > 0 ? (
        <button
          type="button"
          onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
          className="focus-ring -mt-1 self-end text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          {selectMode ? "Cancelar" : "Selecionar"}
        </button>
      ) : null}

      {days.length === 0 ? (
        <p className="py-10 text-center text-[0.8125rem] text-[color:var(--text-muted)]">
          {items.length === 0
            ? "Nenhum lançamento nesse período."
            : "Nada encontrado com esse filtro."}
        </p>
      ) : (
        <div key={focusedDay ?? monthIso} className="flex flex-col gap-5">
          {days.map(({ day, past, future }, i) => (
            <section
              key={day}
              className="flex animate-in flex-col gap-2 fade-in-0 slide-in-from-bottom-2 fill-mode-both"
              style={{ animationDelay: `${Math.min(i, 8) * 55}ms`, animationDuration: "320ms" }}
            >
              <header className="px-1">
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
                  {DAY_FMT.format(new Date(`${day}T00:00:00Z`)).replace(",", "")}
                </span>
              </header>
              <div className="flex flex-col gap-2">
                {past.map((t) => (
                  <TxnRow
                    key={t.id}
                    txn={t}
                    href={`/app/lancamentos/${t.id}` as Route}
                    selectMode={selectMode}
                    selected={selectedIds.has(t.id)}
                    onSelectToggle={() => toggleSelect(t.id)}
                    onLongPress={() => {
                      setSelectMode(true);
                      setSelectedIds((prev) => new Set(prev).add(t.id));
                    }}
                    account={accountById.get(t.accountId ?? "") ?? null}
                  />
                ))}
                {future.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 px-1 pt-1">
                      <Clock size={12} strokeWidth={2} aria-hidden className="text-[color:var(--text-muted)]" />
                      <span className="text-[0.625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
                        Ainda vai sair
                      </span>
                    </div>
                    {future.map((t) => (
                      <TxnRow
                        key={t.id}
                        txn={t}
                        href={`/app/lancamentos/${t.id}` as Route}
                        selectMode={selectMode}
                        selected={selectedIds.has(t.id)}
                        onSelectToggle={() => toggleSelect(t.id)}
                        onLongPress={() => {
                          setSelectMode(true);
                          setSelectedIds((prev) => new Set(prev).add(t.id));
                        }}
                        account={accountById.get(t.accountId ?? "") ?? null}
                      />
                    ))}
                  </>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectMode ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border-soft)] bg-[color:var(--surface-solid)] px-4 pt-3 shadow-[0_-10px_30px_-12px_rgba(31,29,28,0.45)] [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="mx-auto flex max-w-md items-center gap-2">
            <button
              type="button"
              onClick={exitSelect}
              aria-label="Cancelar seleção"
              className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)]"
            >
              <X size={18} strokeWidth={2.25} aria-hidden />
            </button>
            <span className="flex-1 text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              {selectedIds.size} selecionado{selectedIds.size === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => setOptionsSheet(true)}
              className="focus-ring flex items-center gap-1.5 rounded-full bg-[color:var(--color-brand-500)] px-4 py-2 text-[0.8125rem] font-bold text-white transition-[filter] hover:brightness-105 disabled:opacity-40"
            >
              Opções
              <ChevronDown size={15} strokeWidth={2.25} aria-hidden className="rotate-180" />
            </button>
          </div>
        </div>
      ) : null}

      <Sheet open={optionsSheet} onOpenChange={setOptionsSheet}>
        <SheetContent side="bottom" className="flex flex-col gap-1 px-6 pb-8 pt-3">
          <div
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <SheetHeader>
            <SheetTitle>
              {selectedIds.size} selecionado{selectedIds.size === 1 ? "" : "s"}
            </SheetTitle>
          </SheetHeader>
          <button
            type="button"
            onClick={() => {
              setOptionsSheet(false);
              setBulkSheet(true);
            }}
            className="focus-ring mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
              <Tag size={16} strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              Categorizar
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOptionsSheet(false);
              setMoveSheet(true);
            }}
            className="focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-2)] text-[color:var(--text-secondary)]">
              <Wallet size={16} strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              Guardar em…
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOptionsSheet(false);
              if (selectedAllExcluded) applyBulkExclude(false);
              else setExcludeSheet(true);
            }}
            className="focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-2)] text-[color:var(--text-secondary)]">
              {selectedAllExcluded ? (
                <Eye size={16} strokeWidth={2} aria-hidden />
              ) : (
                <EyeOff size={16} strokeWidth={2} aria-hidden />
              )}
            </span>
            <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              {selectedAllExcluded ? "Voltar a contar no mês" : "Não contar no mês"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOptionsSheet(false);
              setDeleteSheet(true);
            }}
            className="focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[color:var(--semantic-negative)]/[0.08]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--semantic-negative)]/[0.14] text-[color:var(--semantic-negative)]">
              <Trash2 size={16} strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[0.875rem] font-bold text-[color:var(--semantic-negative)]">
              Apagar
            </span>
          </button>
        </SheetContent>
      </Sheet>

      <Sheet open={moveSheet} onOpenChange={setMoveSheet}>
        <SheetContent side="bottom" className="flex max-h-[75vh] flex-col overflow-y-auto px-6 pb-8 pt-3">
          <div
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <BackToOptions
            onBack={() => {
              setMoveSheet(false);
              setOptionsSheet(true);
            }}
          />
          <SheetHeader>
            <SheetTitle>Pra onde vai esse dinheiro?</SheetTitle>
            <SheetDescription className="text-[0.75rem] text-[color:var(--text-secondary)]">
              Continua seu dinheiro. Só muda de bolso, não é gasto.
            </SheetDescription>
          </SheetHeader>
          {originLabel ? (
            <p className="mt-2 text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
              {originLabel}
            </p>
          ) : null}

          <div className="mt-3 flex flex-col gap-4">
            {showBackToDaily && baseAccount ? (
              <button
                type="button"
                disabled={bulkPending}
                onClick={() => applyMove(baseAccount.id, "Carteira")}
                className="focus-ring flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] px-3 py-2.5 text-left transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
              >
                <Undo2 size={16} strokeWidth={2} aria-hidden className="text-[color:var(--text-secondary)]" />
                <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  Pro dia a dia (Carteira)
                </span>
              </button>
            ) : null}

            {reserveAccounts.length > 0 ? (
              <GuardarGroup
                title="Guardar numa reserva"
                accounts={reserveAccounts}
                disabled={bulkPending}
                onPick={applyMove}
              />
            ) : null}

            {contaAccounts.length > 0 ? (
              <GuardarGroup
                title="Mandar pra uma conta"
                accounts={contaAccounts}
                disabled={bulkPending}
                onPick={applyMove}
              />
            ) : null}

            <button
              type="button"
              onClick={() => {
                setMoveSheet(false);
                setCreateAccountSheet(true);
              }}
              className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[color:var(--color-brand-500)] transition-colors hover:bg-[color:var(--surface-2)]"
            >
              <Plus size={16} strokeWidth={2.5} aria-hidden />
              <span className="text-[0.875rem] font-bold">Criar novo lugar pra guardar</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={createAccountSheet}
        onOpenChange={(o) => {
          setCreateAccountSheet(o);
          if (!o) {
            setNewAccountName("");
            setNewAccountIsReserve(false);
          }
        }}
      >
        <SheetContent side="bottom" className="flex flex-col gap-4 px-6 pb-8 pt-3">
          <div
            className="mx-auto mb-1 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <BackToOptions
            onBack={() => {
              setCreateAccountSheet(false);
              setMoveSheet(true);
            }}
          />
          <SheetHeader>
            <SheetTitle>Criar um lugar pra guardar</SheetTitle>
            <SheetDescription className="text-[0.75rem] text-[color:var(--text-secondary)]">
              Um banco, uma caixinha, uma reserva. O dinheiro continua seu.
            </SheetDescription>
          </SheetHeader>
          <input
            type="text"
            autoComplete="off"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createAndMove();
              }
            }}
            placeholder="Nome, ex: Reserva de emergência"
            className={wizardInputClass}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNewAccountIsReserve(false)}
              className={`focus-ring rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-colors ${
                !newAccountIsReserve
                  ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.10]"
                  : "border-[color:var(--border-soft)]"
              }`}
            >
              <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">Livre</div>
              <div className="text-[0.625rem] text-[color:var(--text-muted)]">Dia a dia, pode usar</div>
            </button>
            <button
              type="button"
              onClick={() => setNewAccountIsReserve(true)}
              className={`focus-ring rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-colors ${
                newAccountIsReserve
                  ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.10]"
                  : "border-[color:var(--border-soft)]"
              }`}
            >
              <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">Reserva</div>
              <div className="text-[0.625rem] text-[color:var(--text-muted)]">Guardado, não mexer</div>
            </button>
          </div>
          <Button type="button" variant="brand" loading={bulkPending} onClick={createAndMove}>
            Criar e guardar
          </Button>
        </SheetContent>
      </Sheet>

      <Sheet open={excludeSheet} onOpenChange={setExcludeSheet}>
        <SheetContent side="bottom" className="flex flex-col gap-4 px-6 pb-8 pt-3">
          <div
            className="mx-auto mb-1 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <BackToOptions
            onBack={() => {
              setExcludeSheet(false);
              setOptionsSheet(true);
            }}
          />
          <SheetHeader>
            <SheetTitle>
              Não contar {selectedIds.size} no mês?
            </SheetTitle>
          </SheetHeader>
          <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
            Some do número do mês (sobra, gastos, projeção), mas continua na lista. Pra
            transferência entre suas contas e o que não é gasto nem renda. Não mexe no saldo.
          </p>
          <button
            type="button"
            disabled={bulkPending}
            onClick={() => applyBulkExclude(true)}
            className="focus-ring flex w-full items-center justify-center rounded-xl bg-[color:var(--color-brand-500)] px-4 py-3 text-[0.875rem] font-bold text-white transition-[filter] hover:brightness-105 disabled:opacity-60"
          >
            Não contar no mês
          </button>
        </SheetContent>
      </Sheet>

      <Sheet open={deleteSheet} onOpenChange={setDeleteSheet}>
        <SheetContent side="bottom" className="flex flex-col gap-4 px-6 pb-8 pt-3">
          <div
            className="mx-auto mb-1 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <BackToOptions
            onBack={() => {
              setDeleteSheet(false);
              setOptionsSheet(true);
            }}
          />
          <SheetHeader>
            <SheetTitle>
              Apagar {selectedIds.size} lançamento{selectedIds.size === 1 ? "" : "s"}?
            </SheetTitle>
          </SheetHeader>
          <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
            O que estava pago volta pro saldo da conta. Não dá pra desfazer.
          </p>
          <button
            type="button"
            disabled={bulkPending}
            onClick={applyBulkDelete}
            className="focus-ring flex w-full items-center justify-center rounded-xl bg-[color:var(--semantic-negative)] px-4 py-3 text-[0.875rem] font-bold text-white transition-[filter] hover:brightness-105 disabled:opacity-60"
          >
            Apagar
          </button>
        </SheetContent>
      </Sheet>

      <Sheet open={bulkSheet} onOpenChange={setBulkSheet}>
        <SheetContent side="bottom" className="flex max-h-[70vh] flex-col overflow-y-auto px-6 pb-8 pt-3">
          <div
            className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <BackToOptions
            onBack={() => {
              setBulkSheet(false);
              setOptionsSheet(true);
            }}
          />
          <SheetHeader>
            <SheetTitle>
              Categorizar {selectedIds.size} lançamento{selectedIds.size === 1 ? "" : "s"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-3 flex flex-col gap-1">
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => applyBulk(null)}
              className="focus-ring flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[0.875rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
            >
              <CircleDashed size={16} strokeWidth={2} aria-hidden className="text-[color:var(--text-muted)]" />
              Sem categoria
            </button>
            {bulkCategories.map((c) => {
              const Icon = categoryIcon(c.icon);
              return (
                <button
                  key={c.key}
                  type="button"
                  disabled={bulkPending}
                  onClick={() => applyBulk(c.key)}
                  className="focus-ring flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[0.875rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
                >
                  <Icon size={16} strokeWidth={2} aria-hidden className="text-[color:var(--text-secondary)]" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={monthSheet}
        onOpenChange={(open) => {
          setMonthSheet(open);
          if (open) setActiveYear(Number(monthIso.slice(0, 4)));
        }}
      >
        <SheetContent side="bottom" className="px-6 pb-8 pt-3">
          <div
            className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <SheetHeader>
            <SheetTitle>Escolher mês</SheetTitle>
          </SheetHeader>

          <div className="mt-4 flex flex-wrap gap-2">
            {monthYears(monthIso).map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setActiveYear(year)}
                className={`focus-ring rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                  year === activeYear
                    ? "bg-[color:var(--color-brand-500)] text-white"
                    : "bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)]"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {MONTH_SHORT.map((label, i) => {
              const iso = `${activeYear}-${String(i + 1).padStart(2, "0")}`;
              const isSel = iso === monthIso;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setMonthSheet(false);
                    router.push(`/app/lancamentos?month=${iso}` as Route);
                  }}
                  className={`focus-ring flex items-center justify-center rounded-xl border px-2 py-3 text-[0.875rem] font-bold transition-colors ${
                    isSel
                      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.12] text-[color:var(--color-brand-800)]"
                      : "border-[color:var(--border-soft)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={moreCats} onOpenChange={setMoreCats}>
        <SheetContent
          side="bottom"
          className="flex max-h-[70vh] flex-col overflow-y-auto px-6 pb-8 pt-3"
        >
          <div
            className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
            aria-hidden
          />
          <SheetHeader>
            <SheetTitle>Filtrar por categoria</SheetTitle>
          </SheetHeader>
          <div className="mt-3 flex flex-col gap-1">
            {[
              { key: ALL_VALUE, label: "Todas as categorias" },
              ...(noneCount > 0 ? [{ key: NO_CATEGORY_VALUE, label: "Sem categoria" }] : []),
              ...sortedCategories,
            ].map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setCategoryFilter(c.key);
                  setMoreCats(false);
                }}
                className={`focus-ring rounded-lg px-3 py-2.5 text-left text-[0.875rem] font-semibold transition-colors ${
                  categoryFilter === c.key
                    ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
                    : "text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function groupByDay(
  items: SerializedTxn[],
): { day: string; past: SerializedTxn[]; future: SerializedTxn[] }[] {
  const map = new Map<string, SerializedTxn[]>();
  for (const t of items) {
    const k = dayKey(t.occurredAtIso);
    const list = map.get(k) ?? [];
    list.push(t);
    map.set(k, list);
  }
  return Array.from(map.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((day) => {
      const entries = map.get(day) ?? [];
      return {
        day,
        past: entries.filter((t) => t.status !== "scheduled"),
        future: entries.filter((t) => t.status === "scheduled"),
      };
    });
}

function BackToOptions({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="focus-ring -mt-1 mb-2 flex w-fit items-center gap-1 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
    >
      <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
      Voltar
    </button>
  );
}

function GuardarGroup({
  title,
  accounts,
  disabled,
  onPick,
}: {
  title: string;
  accounts: CashAccountOption[];
  disabled: boolean;
  onPick: (id: string, label: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[0.625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
        {title}
      </span>
      {accounts.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(a.id, a.label)}
          className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
        >
          <Wallet size={16} strokeWidth={2} aria-hidden className="text-[color:var(--text-secondary)]" />
          <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            {a.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function TxnRow({
  txn,
  href,
  onSelectToggle,
  onLongPress,
  selectMode = false,
  selected = false,
  account = null,
}: {
  txn: SerializedTxn;
  href: Route;
  onSelectToggle?: () => void;
  onLongPress?: () => void;
  selectMode?: boolean;
  selected?: boolean;
  account?: CashAccountOption | null;
}) {
  const isIn = txn.direction === "in";
  const scheduled = txn.status === "scheduled";
  const excluded = txn.excludedFromTotals;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  function start() {
    if (!onLongPress) return;
    fired.current = false;
    timer.current = setTimeout(() => {
      fired.current = true;
      onLongPress();
    }, 450);
  }
  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  const className = `focus-ring flex items-center gap-3 rounded-xl border bg-[color:var(--surface-1)] px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)] ${
    selected
      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.08]"
      : "border-[color:var(--border-soft)]"
  } ${scheduled || excluded ? "opacity-70" : ""}`;

  const content = (
    <>
      {selectMode ? (
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
            selected
              ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)] text-white"
              : "border-[color:var(--border-strong)]"
          }`}
        >
          {selected ? <Check size={12} strokeWidth={3} /> : null}
        </span>
      ) : null}
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isIn
            ? "bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]"
            : "bg-[color:var(--semantic-negative)]/[0.14] text-[color:var(--semantic-negative)]"
        }`}
      >
        {isIn ? (
          <ArrowDownLeft size={16} strokeWidth={2.25} aria-hidden />
        ) : (
          <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          {txn.description}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] text-[color:var(--text-muted)]">
          {excluded ? (
            <span className="inline-flex items-center gap-1 font-bold uppercase tracking-[0.4px] text-[color:var(--text-secondary)]">
              <EyeOff size={11} strokeWidth={2.25} aria-hidden />
              Não conta
            </span>
          ) : scheduled ? (
            <span className="inline-flex items-center gap-1 font-bold uppercase tracking-[0.4px] text-[color:var(--text-secondary)]">
              <Clock size={11} strokeWidth={2.25} aria-hidden />
              Previsto
            </span>
          ) : null}
          {excluded || scheduled ? <span aria-hidden>·</span> : null}
          <span className="truncate">{txn.categoryLabel ?? "Sem categoria"}</span>
          {account && !account.isBase ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">
                {account.isReserve ? "Guardado em " : "Em "}
                {account.label}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <span
        className={`shrink-0 text-[0.9375rem] font-extrabold tabular-nums ${
          excluded
            ? "text-[color:var(--text-muted)] line-through"
            : isIn
              ? "text-[color:var(--semantic-positive)]"
              : "text-[color:var(--semantic-negative)]"
        }`}
      >
        {isIn ? "+" : "-"}
        {txn.amountFormatted}
      </span>
    </>
  );

  const pointerHandlers = {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: MouseEvent) => {
      if (onLongPress) {
        e.preventDefault();
        fired.current = true;
        onLongPress();
      }
    },
  };

  if (selectMode) {
    return (
      <button
        type="button"
        onClick={onSelectToggle}
        aria-pressed={selected}
        className={className}
        {...pointerHandlers}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (fired.current) {
          fired.current = false;
          e.preventDefault();
        }
      }}
      className={className}
      {...pointerHandlers}
    >
      {content}
    </Link>
  );
}
