"use client";

import { CalendarRange, Check, ChevronRight, HandCoins, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

import {
  addOverrideAction,
  addPeriodAction,
  deleteAdjustmentAction,
  type SerializedAdjustment,
  type SerializedMonthlyAmount,
} from "../_actions/historico.action";

interface Props {
  debtId: string;
  debtLabel: string;
  initialAdjustments: SerializedAdjustment[];
  initialTimeline: SerializedMonthlyAmount[];
}

const MONTH_NAMES_PT = [
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

function formatMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  if (!y || !m) return monthKey;
  const idx = Number(m) - 1;
  const name = MONTH_NAMES_PT[idx] ?? m;
  return `${name}/${y}`;
}

function formatBRL(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDueDayOnly(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Vence dia ${d.getUTCDate()}`;
}

function parseMoneyInput(value: string): bigint | null {
  // Aceita "39,90" / "39.90" / "39" / "1234,56". Retorna cents bigint ou null
  // se parsing falhar.
  const cleaned = value.replace(/[^\d,.]/g, "").replace(",", ".");
  if (cleaned.length === 0) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return BigInt(Math.round(num * 100));
}

function currentMonthKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function HistoricoClient({ debtId, initialAdjustments, initialTimeline }: Props) {
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [monthSheetFor, setMonthSheetFor] = useState<SerializedMonthlyAmount | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Mostra a timeline com o mês mais recente no topo.
  const orderedTimeline = useMemo(() => [...timeline].reverse(), [timeline]);

  const periods = useMemo(() => adjustments.filter((a) => a.kind === "period"), [adjustments]);

  const allSelected = orderedTimeline.length > 0 && selected.size === orderedTimeline.length;

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(orderedTimeline.map((r) => r.monthKey)));
  }

  function toggleSelect(monthKey: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }

  async function refresh() {
    // Refetch via server action via página: re-hidrata invocando uma chamada
    // simples ao endpoint do timeline. Caminho preguiçoso: o usuário enxerga
    // a UI otimista até o revalidate cair via revalidatePath na próxima
    // navegação. Pra MVP, fica assim.
    setEditingMonth(null);
    setPeriodModalOpen(false);
  }

  function handleAddPeriod(formData: FormData) {
    setError(null);
    const startMonth = String(formData.get("startMonth") ?? "");
    const endMonthRaw = String(formData.get("endMonth") ?? "");
    const endMonth = endMonthRaw.trim() === "" ? null : endMonthRaw;
    const amountRaw = String(formData.get("amount") ?? "");
    const cents = parseMoneyInput(amountRaw);
    if (cents === null) {
      setError("Informe um valor válido.");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(startMonth)) {
      setError("Mês inicial inválido.");
      return;
    }
    if (endMonth !== null && !/^\d{4}-\d{2}$/.test(endMonth)) {
      setError("Mês final inválido.");
      return;
    }

    startTransition(async () => {
      const result = await addPeriodAction({
        debtId,
        startMonth,
        endMonth,
        amountCents: cents.toString(),
        note: null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Atualização otimista: adiciona o ajuste localmente e recalcula a
      // timeline em memória. Quando o usuário voltar pra detail page, o
      // revalidatePath do server traz o estado autoritativo.
      const optimistic: SerializedAdjustment = {
        id: result.data.adjustmentId,
        kind: "period",
        startMonth,
        endMonth,
        month: null,
        amountCents: cents.toString(),
        note: null,
      };
      const nextAdjustments = [...adjustments, optimistic];
      setAdjustments(nextAdjustments);
      setTimeline((tl) =>
        tl.map((row) => {
          const inRange =
            row.monthKey >= startMonth && (endMonth === null || row.monthKey <= endMonth);
          if (!inRange) return row;
          // Override pontual continua ganhando.
          if (row.source === "override") return row;
          return {
            ...row,
            amountCents: cents.toString(),
            source: "period",
            adjustmentId: result.data.adjustmentId,
            note: null,
          };
        }),
      );
      void refresh();
    });
  }

  function applyOverrideToState(month: string, adjustmentId: string, amountCents: string) {
    setAdjustments((prev) => [
      ...prev.filter((a) => !(a.kind === "override" && a.month === month)),
      {
        id: adjustmentId,
        kind: "override",
        startMonth: null,
        endMonth: null,
        month,
        amountCents,
        note: null,
      },
    ]);
    setTimeline((tl) =>
      tl.map((row) =>
        row.monthKey === month
          ? { ...row, amountCents, source: "override", adjustmentId, note: null }
          : row,
      ),
    );
  }

  function handleAddOverride(month: string, formData: FormData) {
    setError(null);
    const amountRaw = String(formData.get("amount") ?? "");
    const cents = parseMoneyInput(amountRaw);
    if (cents === null) {
      setError("Informe um valor válido.");
      return;
    }
    startTransition(async () => {
      const result = await addOverrideAction({
        debtId,
        month,
        amountCents: cents.toString(),
        note: null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      applyOverrideToState(month, result.data.adjustmentId, cents.toString());
      void refresh();
    });
  }

  function handleBulkAdjust(formData: FormData) {
    setError(null);
    const amountRaw = String(formData.get("amount") ?? "");
    const cents = parseMoneyInput(amountRaw);
    if (cents === null) {
      setError("Informe um valor válido.");
      return;
    }
    const months = Array.from(selected);
    startTransition(async () => {
      const results = await Promise.all(
        months.map((month) =>
          addOverrideAction({ debtId, month, amountCents: cents.toString(), note: null }).then(
            (r) => ({ month, r }),
          ),
        ),
      );
      const failed = results.find(({ r }) => !r.ok);
      if (failed && !failed.r.ok) {
        setError(failed.r.message);
      }
      for (const { month, r } of results) {
        if (r.ok) applyOverrideToState(month, r.data.adjustmentId, cents.toString());
      }
      setSelected(new Set());
      setBulkModalOpen(false);
    });
  }

  function handleDelete(adjustmentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteAdjustmentAction({ debtId, adjustmentId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setAdjustments((prev) => prev.filter((a) => a.id !== adjustmentId));
      // Reset todos os meses que apontavam pra esse adjustmentId pra "base" (0n
      // como aproximação; correção exata vem do refetch via revalidatePath).
      setTimeline((tl) =>
        tl.map((row) =>
          row.adjustmentId === adjustmentId
            ? { ...row, source: "base", adjustmentId: null, amountCents: "0" }
            : row,
        ),
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          {error}
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
              Linha do tempo
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
              Cada mês com a data prevista de pagamento.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="focus-ring rounded-full border border-[color:var(--border-soft)] px-3 py-1.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)]"
            >
              {allSelected ? "Limpar seleção" : "Selecionar"}
            </button>
            <button
              type="button"
              onClick={() => setPeriodModalOpen(true)}
              disabled={pending}
              className="focus-ring inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-3 py-1.5 text-[0.75rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.3)] disabled:opacity-50"
            >
              <Plus size={14} strokeWidth={2.25} aria-hidden />
              Faixa
            </button>
          </div>
        </div>

        {periods.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {periods.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] py-1 pl-3 pr-1.5 text-[0.75rem] text-[color:var(--text-primary)]"
              >
                <CalendarRange
                  size={12}
                  strokeWidth={2}
                  className="text-[color:var(--color-brand-800)]"
                  aria-hidden
                />
                {formatMonth(p.startMonth ?? "")}
                {" → "}
                {p.endMonth ? formatMonth(p.endMonth) : "em diante"}
                <span className="text-[color:var(--text-secondary)]">
                  <HideableValue>{formatBRL(BigInt(p.amountCents))}</HideableValue>
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={pending}
                  aria-label="Apagar faixa"
                  className="focus-ring rounded-full p-1 text-[color:var(--semantic-negative)] hover:bg-[color:var(--semantic-negative)]/10 disabled:opacity-50"
                >
                  <X size={12} strokeWidth={2} aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {selected.size > 0 ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/10 px-3 py-2">
            <span className="text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)]">
              {selected.size} {selected.size === 1 ? "mês selecionado" : "meses selecionados"}
            </span>
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              disabled={pending}
              className="focus-ring rounded-full bg-[color:var(--color-brand-700)] px-3 py-1.5 text-[0.75rem] font-bold text-white disabled:opacity-50"
            >
              Ajustar selecionados
            </button>
          </div>
        ) : null}

        <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)]">
          <ul className="divide-y divide-[color:var(--border-soft)]">
            {orderedTimeline.map((row) => {
              const isCurrent = row.monthKey === currentMonthKey();
              const isSelected = selected.has(row.monthKey);
              const dueLabel = formatDueDayOnly(row.dueDateIso);
              const sourceBadge =
                row.source === "override"
                  ? {
                      label: "Ajustado",
                      cls: "bg-[color:var(--color-brand-500)]/20 text-[color:var(--color-brand-800)]",
                    }
                  : row.source === "period"
                    ? {
                        label: "Faixa",
                        cls: "bg-[color:var(--semantic-info)]/15 text-[color:var(--semantic-info)]",
                      }
                    : null;
              const rowCls = [
                "focus-ring flex w-full items-center gap-3 px-3 py-2.5 text-left text-[0.8125rem] tabular-nums transition-colors hover:bg-[color:var(--surface-1)]",
                isCurrent || isSelected
                  ? "bg-[color:var(--color-brand-500)]/[0.10] font-semibold text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-primary)]",
              ].join(" ");
              return (
                <li key={row.monthKey}>
                  <button type="button" onClick={() => setMonthSheetFor(row)} className={rowCls}>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold text-[0.875rem]">
                        {formatMonth(row.monthKey)}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] text-[color:var(--text-muted)]">
                        {dueLabel}
                        {sourceBadge ? (
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider ${sourceBadge.cls}`}
                          >
                            {sourceBadge.label}
                          </span>
                        ) : null}
                        {isCurrent ? (
                          <span className="rounded-full bg-[color:var(--color-brand-500)]/15 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-[color:var(--color-brand-800)]">
                            Atual
                          </span>
                        ) : null}
                        {isSelected ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[color:var(--color-brand-500)]/15 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-[color:var(--color-brand-800)]">
                            <Check size={10} strokeWidth={3} aria-hidden />
                            Selecionado
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <span className="text-[0.875rem] font-semibold">
                      <HideableValue>{formatBRL(BigInt(row.amountCents))}</HideableValue>
                    </span>
                    <ChevronRight
                      size={18}
                      strokeWidth={2}
                      className="shrink-0 text-[color:var(--text-muted)]"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <Sheet open={monthSheetFor !== null} onOpenChange={(open) => !open && setMonthSheetFor(null)}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="p-4">
            <SheetTitle>{monthSheetFor ? formatMonth(monthSheetFor.monthKey) : ""}</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-[color:var(--border-soft)] border-t border-[color:var(--border-soft)]">
            <button
              type="button"
              onClick={() => {
                if (monthSheetFor) toggleSelect(monthSheetFor.monthKey);
                setMonthSheetFor(null);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
                <Check size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                {monthSheetFor && selected.has(monthSheetFor.monthKey)
                  ? "Remover da seleção"
                  : "Selecionar"}
              </span>
            </button>

            {monthSheetFor?.dueDateIso ? (
              <Link
                href={
                  `/app/dividas/${debtId}/pagar?paidAt=${monthSheetFor.dueDateIso.slice(0, 10)}` as Route
                }
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
                  <HandCoins size={18} strokeWidth={2} aria-hidden />
                </span>
                <span className="flex-1 text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  Pagar
                </span>
                <ChevronRight
                  size={18}
                  strokeWidth={2}
                  className="shrink-0 text-[color:var(--text-muted)]"
                  aria-hidden
                />
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => {
                if (monthSheetFor) setEditingMonth(monthSheetFor.monthKey);
                setMonthSheetFor(null);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
                <Pencil size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="flex-1 text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                Ajustar valor
              </span>
              <ChevronRight
                size={18}
                strokeWidth={2}
                className="shrink-0 text-[color:var(--text-muted)]"
                aria-hidden
              />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={periodModalOpen} onOpenChange={setPeriodModalOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Nova faixa de valor</SheetTitle>
          </SheetHeader>
          <form action={(fd) => handleAddPeriod(fd)} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
              Mês inicial
              <input
                required
                name="startMonth"
                type="month"
                className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.875rem] text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
              Mês final (opcional, em branco = em diante)
              <input
                name="endMonth"
                type="month"
                className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.875rem] text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
              Valor mensal
              <input
                required
                name="amount"
                inputMode="decimal"
                placeholder="Ex: 39,90"
                className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.875rem] text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="focus-ring mt-2 rounded-2xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] disabled:opacity-50"
            >
              {pending ? <Spinner size={16} decorative /> : "Salvar faixa"}
            </button>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={editingMonth !== null} onOpenChange={(open) => !open && setEditingMonth(null)}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Ajustar {editingMonth ? formatMonth(editingMonth) : ""}</SheetTitle>
          </SheetHeader>
          <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
            Valor pontual deste mês. Sobrepõe qualquer faixa que cubra este mês.
          </p>
          <form
            action={(fd) => {
              if (editingMonth) handleAddOverride(editingMonth, fd);
            }}
            className="mt-3 flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
              Valor pago
              <input
                required
                name="amount"
                inputMode="decimal"
                placeholder="Ex: 55,90"
                className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.875rem] text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="focus-ring mt-2 rounded-2xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] disabled:opacity-50"
            >
              {pending ? <Spinner size={16} decorative /> : "Salvar ajuste"}
            </button>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>
              Ajustar {selected.size} {selected.size === 1 ? "mês" : "meses"}
            </SheetTitle>
          </SheetHeader>
          <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
            Mesmo valor pontual pra todos os meses selecionados.
          </p>
          <form action={(fd) => handleBulkAdjust(fd)} className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
              Valor mensal
              <input
                required
                name="amount"
                inputMode="decimal"
                placeholder="Ex: 55,90"
                className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.875rem] text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="focus-ring mt-2 rounded-2xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] disabled:opacity-50"
            >
              {pending ? <Spinner size={16} decorative /> : "Salvar pra todos"}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
