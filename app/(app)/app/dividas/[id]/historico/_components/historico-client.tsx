"use client";

import { CalendarRange, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
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

function formatDueDayMonth(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const monthIdx = d.getUTCMonth();
  const month = MONTH_NAMES_PT[monthIdx] ?? "";
  return `${day}/${month.toLowerCase()}`;
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

  // Mostra a timeline com o mês mais recente no topo.
  const orderedTimeline = useMemo(() => [...timeline].reverse(), [timeline]);

  const periods = useMemo(() => adjustments.filter((a) => a.kind === "period"), [adjustments]);

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
        id: result.adjustmentId,
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
            adjustmentId: result.adjustmentId,
            note: null,
          };
        }),
      );
      void refresh();
    });
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
      const optimistic: SerializedAdjustment = {
        id: result.adjustmentId,
        kind: "override",
        startMonth: null,
        endMonth: null,
        month,
        amountCents: cents.toString(),
        note: null,
      };
      setAdjustments((prev) => [
        ...prev.filter((a) => !(a.kind === "override" && a.month === month)),
        optimistic,
      ]);
      setTimeline((tl) =>
        tl.map((row) =>
          row.monthKey === month
            ? {
                ...row,
                amountCents: cents.toString(),
                source: "override",
                adjustmentId: result.adjustmentId,
                note: null,
              }
            : row,
        ),
      );
      void refresh();
    });
  }

  function handleDelete(adjustmentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteAdjustmentAction(debtId, adjustmentId);
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

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
              Faixas de valor
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
              Reajustes ou períodos com valor diferente do base.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPeriodModalOpen(true)}
            disabled={pending}
            className="focus-ring inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-3 py-1.5 text-[0.75rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.3)] disabled:opacity-50"
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Adicionar
          </button>
        </div>
        {periods.length === 0 ? (
          <p className="mt-3 text-[0.8125rem] text-[color:var(--text-muted)]">
            Nenhuma faixa cadastrada. O valor base da dívida vale pra todos os meses.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {periods.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2"
              >
                <div className="flex items-center gap-2 text-[0.8125rem] text-[color:var(--text-primary)]">
                  <CalendarRange
                    size={14}
                    strokeWidth={2}
                    className="text-[color:var(--color-brand-800)]"
                    aria-hidden
                  />
                  <span className="font-semibold">
                    {formatMonth(p.startMonth ?? "")}
                    {" → "}
                    {p.endMonth ? formatMonth(p.endMonth) : "em diante"}
                  </span>
                  <span className="text-[color:var(--text-secondary)]">
                    <HideableValue>{formatBRL(BigInt(p.amountCents))}</HideableValue>/mês
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={pending}
                  aria-label="Apagar faixa"
                  className="focus-ring rounded-full p-1.5 text-[color:var(--semantic-negative)] hover:bg-[color:var(--semantic-negative)]/10 disabled:opacity-50"
                >
                  <Trash2 size={14} strokeWidth={2} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
              Linha do tempo
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
              Cada mês com a data prevista de pagamento. Toque em ajustar pra mudar só o valor desse
              mês.
            </p>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)]">
          <div className="grid grid-cols-[1fr_84px_1fr_88px] gap-2 px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            <span>Mês</span>
            <span className="text-right">Data</span>
            <span className="text-right">Valor</span>
            <span />
          </div>
          <ul className="divide-y divide-[color:var(--border-soft)]">
            {orderedTimeline.map((row) => {
              const isCurrent = row.monthKey === currentMonthKey();
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
                    : {
                        label: "Base",
                        cls: "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]",
                      };
              const rowCls = [
                "grid grid-cols-[1fr_84px_1fr_88px] items-center gap-2 px-3 py-2.5 text-[0.8125rem] tabular-nums",
                isCurrent
                  ? "bg-[color:var(--color-brand-500)]/[0.10] font-semibold text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-primary)]",
              ].join(" ");
              return (
                <li key={row.monthKey} className={rowCls}>
                  <div className="flex flex-col">
                    <span className="font-semibold text-[0.875rem]">{formatMonth(row.monthKey)}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider ${sourceBadge.cls}`}
                      >
                        {sourceBadge.label}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-full bg-[color:var(--color-brand-500)]/15 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-[color:var(--color-brand-800)]">
                          Atual
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <span className="text-right text-[0.8125rem] text-[color:var(--text-secondary)]">
                    {formatDueDayMonth(row.dueDateIso)}
                  </span>
                  <span className="text-right text-[0.875rem] font-semibold">
                    <HideableValue>{formatBRL(BigInt(row.amountCents))}</HideableValue>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingMonth(row.monthKey)}
                    disabled={pending}
                    className="focus-ring justify-self-end rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-1 text-[0.6875rem] font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)] disabled:opacity-50"
                  >
                    Ajustar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {periodModalOpen ? (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 px-3 backdrop-blur-sm sm:items-center"
          onClick={() => setPeriodModalOpen(false)}
        >
          <form
            action={(fd) => handleAddPeriod(fd)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-[color:var(--text-primary)]">
                Nova faixa de valor
              </h3>
              <button
                type="button"
                onClick={() => setPeriodModalOpen(false)}
                aria-label="Fechar"
                className="focus-ring rounded-full p-1 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-3">
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
            </div>
          </form>
        </div>
      ) : null}

      {editingMonth ? (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 px-3 backdrop-blur-sm sm:items-center"
          onClick={() => setEditingMonth(null)}
        >
          <form
            action={(fd) => handleAddOverride(editingMonth, fd)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-[color:var(--text-primary)]">
                Ajustar {formatMonth(editingMonth)}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMonth(null)}
                aria-label="Fechar"
                className="focus-ring rounded-full p-1 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <p className="mb-3 text-[0.75rem] text-[color:var(--text-secondary)]">
              Valor pontual deste mês. Sobrepõe qualquer faixa que cubra este mês.
            </p>
            <div className="flex flex-col gap-3">
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
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
