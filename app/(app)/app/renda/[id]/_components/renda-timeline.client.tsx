"use client";

import { Check, ChevronRight, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";
import type { IncomeSettlementStatus } from "@/domain/entities/income-settlement.entity";

import { settleIncomeAction } from "../../../_actions/planning-actions";
import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";
import type { SerializedIncomeMonth } from "../_actions/income-timeline.action";

interface Props {
  incomeId: string;
  initialTimeline: SerializedIncomeMonth[];
  baseAmountCents: string;
  onTotalDelta?: (deltaCents: bigint) => void;
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

function parseMoneyInput(value: string): bigint | null {
  const cleaned = value.replace(/[^\d,.]/g, "").replace(",", ".");
  if (cleaned.length === 0) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return BigInt(Math.round(num * 100));
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

const STATUS_BADGE: Record<IncomeSettlementStatus, { label: string; cls: string }> = {
  received: {
    label: "Recebido",
    cls: "bg-[color:var(--semantic-positive)]/15 text-[color:var(--semantic-positive)]",
  },
  not_received: {
    label: "Não recebido",
    cls: "bg-[color:var(--semantic-negative)]/12 text-[color:var(--semantic-negative)]",
  },
  adjusted: {
    label: "Ajustado",
    cls: "bg-[color:var(--color-brand-500)]/20 text-[color:var(--color-brand-800)]",
  },
};

export function RendaTimelineClient({
  incomeId,
  initialTimeline,
  baseAmountCents,
  onTotalDelta,
}: Props) {
  const [timeline, setTimeline] = useState(initialTimeline);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [monthSheetFor, setMonthSheetFor] = useState<SerializedIncomeMonth | null>(null);
  const [adjustingMonth, setAdjustingMonth] = useState<string | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const orderedTimeline = useMemo(() => [...timeline].reverse(), [timeline]);
  const selectableTimeline = useMemo(
    () => orderedTimeline.filter((r) => r.monthKey <= currentMonthKey()),
    [orderedTimeline],
  );
  const allSelected = selectableTimeline.length > 0 && selected.size === selectableTimeline.length;

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(selectableTimeline.map((r) => r.monthKey)));
  }

  function toggleSelect(monthKey: string) {
    setSelectionMode(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelected(new Set());
  }

  function applyStatusToState(monthKey: string, status: IncomeSettlementStatus, cents: bigint) {
    const prevRow = timeline.find((r) => r.monthKey === monthKey);
    if (prevRow && monthKey <= currentMonthKey()) {
      onTotalDelta?.(cents - BigInt(prevRow.amountCents));
    }
    setTimeline((tl) =>
      tl.map((row) =>
        row.monthKey === monthKey ? { ...row, status, amountCents: cents.toString() } : row,
      ),
    );
  }

  async function settle(
    monthKey: string,
    status: IncomeSettlementStatus,
    adjustedValueCents?: bigint,
  ) {
    setError(null);
    setPending(true);
    const result = await settleIncomeAction({
      incomeId,
      monthIso: monthKey,
      status,
      ...(adjustedValueCents !== undefined ? { adjustedValueCents } : {}),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    return true;
  }

  async function handleReceived(monthKey: string) {
    const ok = await settle(monthKey, "received");
    if (ok) {
      applyStatusToState(monthKey, "received", BigInt(baseAmountCents));
      setMonthSheetFor(null);
    }
  }

  async function handleNotReceived(monthKey: string) {
    const ok = await settle(monthKey, "not_received");
    if (ok) {
      applyStatusToState(monthKey, "not_received", 0n);
      setMonthSheetFor(null);
    }
  }

  function handleAdjust(monthKey: string, formData: FormData) {
    setError(null);
    const amountRaw = String(formData.get("amount") ?? "");
    const cents = parseMoneyInput(amountRaw);
    if (cents === null || cents <= 0n) {
      setError("Informe um valor válido.");
      return;
    }
    setPending(true);
    settle(monthKey, "adjusted", cents).then((ok) => {
      setPending(false);
      if (ok) {
        applyStatusToState(monthKey, "adjusted", cents);
        setAdjustingMonth(null);
      }
    });
  }

  async function handleBulkReceived() {
    setError(null);
    setPending(true);
    const months = Array.from(selected);
    const results = await Promise.all(
      months.map((monthKey) =>
        settleIncomeAction({ incomeId, monthIso: monthKey, status: "received" }).then((r) => ({
          monthKey,
          r,
        })),
      ),
    );
    setPending(false);
    const failed = results.find(({ r }) => !r.ok);
    if (failed && !failed.r.ok) setError(failed.r.message);
    for (const { monthKey, r } of results) {
      if (r.ok) applyStatusToState(monthKey, "received", BigInt(baseAmountCents));
    }
    exitSelectionMode();
  }

  function handleBulkAdjust(formData: FormData) {
    setError(null);
    const amountRaw = String(formData.get("amount") ?? "");
    const cents = parseMoneyInput(amountRaw);
    if (cents === null || cents <= 0n) {
      setError("Informe um valor válido.");
      return;
    }
    const months = Array.from(selected);
    setPending(true);
    Promise.all(
      months.map((monthKey) =>
        settleIncomeAction({
          incomeId,
          monthIso: monthKey,
          status: "adjusted",
          adjustedValueCents: cents,
        }).then((r) => ({ monthKey, r })),
      ),
    ).then((results) => {
      setPending(false);
      const failed = results.find(({ r }) => !r.ok);
      if (failed && !failed.r.ok) setError(failed.r.message);
      for (const { monthKey, r } of results) {
        if (r.ok) applyStatusToState(monthKey, "adjusted", cents);
      }
      exitSelectionMode();
      setBulkModalOpen(false);
    });
  }

  return (
    <div>
      {error ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Linha do tempo</h2>
          <p className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
            Cada mês dessa renda. Toque num mês pra confirmar o recebimento.
          </p>
        </div>
        {selectionMode ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="focus-ring rounded-full border border-[color:var(--border-soft)] px-3 py-1.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)]"
            >
              {allSelected ? "Limpar seleção" : "Selecionar todos"}
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              aria-label="Cancelar seleção"
              className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)]"
            >
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSelectionMode(true)}
            className="focus-ring shrink-0 rounded-full border border-[color:var(--border-soft)] px-3 py-1.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)]"
          >
            Selecionar
          </button>
        )}
      </div>

      {selected.size > 0 ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/10 px-3 py-2">
          <span className="text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)]">
            {selected.size} {selected.size === 1 ? "mês selecionado" : "meses selecionados"}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              disabled={pending}
              className="focus-ring rounded-full border border-[color:var(--color-brand-600)] px-3 py-1.5 text-[0.75rem] font-bold text-[color:var(--color-brand-800)] disabled:opacity-50"
            >
              Ajustar valor
            </button>
            <button
              type="button"
              onClick={handleBulkReceived}
              disabled={pending}
              className="focus-ring rounded-full bg-[color:var(--color-brand-600)] px-3 py-1.5 text-[0.75rem] font-bold text-white disabled:opacity-50"
            >
              Marcar como recebido
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)]">
        <ul className="divide-y divide-[color:var(--border-soft)]">
          {orderedTimeline.map((row) => {
            const isCurrent = row.monthKey === currentMonthKey();
            const isFuture = row.monthKey > currentMonthKey();
            const isSelected = selected.has(row.monthKey);
            const badge = row.status ? STATUS_BADGE[row.status] : null;
            const rowCls = [
              "focus-ring flex w-full items-center gap-3 px-3 py-2.5 text-left text-[0.8125rem] tabular-nums transition-colors hover:bg-[color:var(--surface-1)]",
              isCurrent || isSelected
                ? "bg-[color:var(--color-brand-500)]/[0.10] font-semibold text-[color:var(--text-primary)]"
                : "text-[color:var(--text-primary)]",
            ].join(" ");

            if (isFuture) {
              return (
                <li key={row.monthKey}>
                  <div className="flex w-full items-center gap-3 px-3 py-2.5 text-[0.8125rem] tabular-nums opacity-60">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold text-[0.875rem] text-[color:var(--text-primary)]">
                        {formatMonth(row.monthKey)}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] text-[color:var(--text-muted)]">
                        {row.dueDay ? `Dia ${row.dueDay}` : null}
                        <span className="inline-flex w-fit items-center rounded-full bg-[color:var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                          Previsto
                        </span>
                      </span>
                    </div>
                    <span className="text-[0.875rem] font-semibold text-[color:var(--text-muted)]">
                      <HideableValue>{formatBRL(BigInt(row.amountCents))}</HideableValue>
                    </span>
                  </div>
                </li>
              );
            }

            return (
              <li key={row.monthKey}>
                <button
                  type="button"
                  onClick={() =>
                    selectionMode ? toggleSelect(row.monthKey) : setMonthSheetFor(row)
                  }
                  className={rowCls}
                >
                  {selectionMode ? (
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                        isSelected
                          ? "border-[color:var(--color-brand-600)] bg-[color:var(--color-brand-600)] text-white"
                          : "border-[color:var(--border-soft)] bg-transparent"
                      }`}
                    >
                      {isSelected ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
                    </span>
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold text-[0.875rem]">
                      {formatMonth(row.monthKey)}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] text-[color:var(--text-muted)]">
                      {row.dueDay ? `Dia ${row.dueDay}` : null}
                      {badge ? (
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      ) : (
                        <span className="inline-flex w-fit items-center rounded-full bg-[color:var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                          Previsto
                        </span>
                      )}
                      {isCurrent ? (
                        <span className="rounded-full bg-[color:var(--color-brand-500)]/15 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-[color:var(--color-brand-800)]">
                          Atual
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <span className="text-[0.875rem] font-semibold">
                    <HideableValue>{formatBRL(BigInt(row.amountCents))}</HideableValue>
                  </span>
                  {selectionMode ? null : (
                    <ChevronRight
                      size={18}
                      strokeWidth={2}
                      className="shrink-0 text-[color:var(--text-muted)]"
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
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

            <button
              type="button"
              disabled={pending}
              onClick={() => monthSheetFor && handleReceived(monthSheetFor.monthKey)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--semantic-positive)]/12 text-[color:var(--semantic-positive)]">
                <Check size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="text-[0.875rem] font-semibold text-[color:var(--semantic-positive)]">
                Recebi
              </span>
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => monthSheetFor && handleNotReceived(monthSheetFor.monthKey)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--semantic-negative)]/12 text-[color:var(--semantic-negative)]">
                <X size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="text-[0.875rem] font-semibold text-[color:var(--semantic-negative)]">
                Não recebi
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (monthSheetFor) setAdjustingMonth(monthSheetFor.monthKey);
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

      <Sheet
        open={adjustingMonth !== null}
        onOpenChange={(open) => !open && setAdjustingMonth(null)}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Ajustar {adjustingMonth ? formatMonth(adjustingMonth) : ""}</SheetTitle>
          </SheetHeader>
          <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
            Valor que caiu de fato nesse mês, se foi diferente do combinado.
          </p>
          <form
            action={(fd) => {
              if (adjustingMonth) handleAdjust(adjustingMonth, fd);
            }}
            className="mt-3 flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
              Valor recebido
              <input
                required
                name="amount"
                inputMode="decimal"
                placeholder="Ex: 1.850,00"
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
            Mesmo valor recebido pra todos os meses selecionados. Bom pra ajustar uma faixa de uma
            vez.
          </p>
          <form action={(fd) => handleBulkAdjust(fd)} className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
              Valor recebido
              <input
                required
                name="amount"
                inputMode="decimal"
                placeholder="Ex: 1.850,00"
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
