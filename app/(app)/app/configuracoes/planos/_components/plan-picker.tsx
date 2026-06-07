"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  Crown,
  Infinity as InfinityIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import type { Plan } from "@/domain/entities/plan.entity";

import { startCheckoutAction } from "../_actions/start-checkout.action";

interface Props {
  plans: Plan[];
}

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const HIGHLIGHTS = [
  "Veja seus meses anteriores na linha do tempo",
  "Cripto e ações atualizam de valor sozinhas",
  "A gente avisa quando uma parcela vence",
];

interface Meta {
  tabLabel: string;
  cadence: string;
  hint: string;
  badge: string | null;
  icon: typeof Sparkles;
  tone: "neutral" | "popular" | "hero";
}

function metaFor(plan: Plan, monthly: Plan | null): Meta {
  if (plan.billingInterval === "year") {
    const yearlyPerMonth = Number(plan.priceCents) / 12;
    const discount = monthly
      ? Math.round((1 - yearlyPerMonth / Number(monthly.priceCents)) * 100)
      : 0;
    return {
      tabLabel: "Anual",
      cadence: "por ano",
      hint: `Equivale a ${fmtBRL.format(yearlyPerMonth / 100)} por mês.`,
      badge: discount > 0 ? "2 meses grátis" : "Mais popular",
      icon: Sparkles,
      tone: "popular",
    };
  }
  if (plan.billingInterval === "lifetime") {
    return {
      tabLabel: "Vitalício",
      cadence: "pagamento único",
      hint: "Paga uma vez e fica Pro pra sempre. Sem renovação.",
      badge: "Para sempre",
      icon: InfinityIcon,
      tone: "hero",
    };
  }
  return {
    tabLabel: "Mensal",
    cadence: "por mês",
    hint: "Cancela quando quiser, sem fidelidade.",
    badge: null,
    icon: Crown,
    tone: "neutral",
  };
}

function orderForTabs(plans: Plan[]): Plan[] {
  const order: Record<string, number> = { month: 0, year: 1, lifetime: 2 };
  return [...plans].sort((a, b) => (order[a.billingInterval] ?? 99) - (order[b.billingInterval] ?? 99));
}

export function PlanPicker({ plans }: Props) {
  const ordered = useMemo(() => orderForTabs(plans), [plans]);
  const monthly = ordered.find((p) => p.billingInterval === "month") ?? null;

  const defaultSlug =
    ordered.find((p) => p.billingInterval === "year")?.slug ?? ordered[0]?.slug ?? "";
  const [selectedSlug, setSelectedSlug] = useState(defaultSlug);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selected = ordered.find((p) => p.slug === selectedSlug) ?? ordered[0];
  if (!selected) return null;

  function handleCheckout() {
    if (!selected) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const result = await startCheckoutAction(selected.slug);
        if (result && !result.ok) {
          setErrorMsg(result.message);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro inesperado ao abrir checkout.";
        if (!msg.includes("NEXT_REDIRECT")) {
          setErrorMsg(msg);
        }
      }
    });
  }

  const meta = metaFor(selected, monthly);
  const Icon = meta.icon;
  const isHero = meta.tone === "hero";
  const price = fmtBRL.format(Number(selected.priceCents) / 100);

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Virar Pro
          </p>
          <h2 className="mt-1 text-[1.25rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            Escolha como assinar
          </h2>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Plano"
        className="relative mt-4 grid grid-cols-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] p-1"
        style={{ ["--tab-count" as string]: ordered.length }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1 rounded-xl border border-[color:var(--color-brand-500)]/55 bg-[linear-gradient(135deg,rgba(242,142,37,0.18),rgba(239,122,26,0.06))] shadow-[0_8px_22px_-12px_rgba(239,122,26,0.55)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            width: `calc((100% - 0.5rem) / ${ordered.length})`,
            transform: `translateX(calc(${ordered.findIndex((p) => p.slug === selectedSlug)} * 100%))`,
          }}
        />
        {ordered.map((plan) => {
          const m = metaFor(plan, monthly);
          const isActive = plan.slug === selectedSlug;
          return (
            <button
              key={plan.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setSelectedSlug(plan.slug)}
              className={
                "focus-ring relative z-10 inline-flex items-center justify-center rounded-xl px-3 py-2 text-[0.78125rem] font-bold transition-colors duration-200 " +
                (isActive
                  ? "text-[color:var(--color-brand-800)]"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]")
              }
            >
              {m.tabLabel}
            </button>
          );
        })}
      </div>

      <div
        className={
          "relative mt-4 overflow-hidden rounded-2xl border p-5 transition-colors duration-200 " +
          (isHero
            ? "border-[color:var(--color-brand-500)]/55 bg-[linear-gradient(155deg,rgba(242,142,37,0.16),rgba(239,122,26,0.04))]"
            : meta.tone === "popular"
              ? "border-[color:var(--color-brand-500)]/35 bg-[color:var(--surface-2)]"
              : "border-[color:var(--border-soft)] bg-[color:var(--surface-2)]")
        }
      >
        {isHero && (
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(242,142,37,0.28),transparent_70%)]"
          />
        )}

        <div className="relative flex items-start justify-between gap-3">
          <span
            className={
              "flex h-10 w-10 items-center justify-center rounded-xl " +
              (isHero
                ? "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_8px_20px_-10px_rgba(239,122,26,0.6)]"
                : "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]")
            }
          >
            <Icon size={18} strokeWidth={2.25} aria-hidden />
          </span>
          {meta.badge && (
            <span
              className={
                "inline-flex items-center rounded-full px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wide " +
                (isHero
                  ? "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_6px_14px_-6px_rgba(239,122,26,0.55)]"
                  : "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]")
              }
            >
              {meta.badge}
            </span>
          )}
        </div>

        <div className="relative mt-4">
          <p className="text-[0.75rem] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
            {selected.name.replace(/^PRO /, "Pro · ")}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[2.5rem] font-extrabold leading-none tracking-tight text-[color:var(--text-primary)] tabular-nums">
              {price}
            </span>
            <span className="text-[0.75rem] font-semibold text-[color:var(--text-muted)]">
              {meta.cadence}
            </span>
          </div>
          <p className="mt-2 text-[0.78125rem] leading-relaxed text-[color:var(--text-secondary)]">
            {meta.hint}
          </p>
        </div>

        <ul className="relative mt-4 flex flex-col gap-2">
          {HIGHLIGHTS.map((h) => (
            <li key={h} className="flex items-start gap-2 text-[0.78125rem] text-[color:var(--text-secondary)]">
              <span
                className={
                  "mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full " +
                  (isHero
                    ? "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white"
                    : "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]")
                }
              >
                <Check size={10} strokeWidth={3} aria-hidden />
              </span>
              <span className="leading-snug">{h}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={isPending}
          className={
            "sf-lift focus-ring relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[0.875rem] font-bold transition-colors disabled:cursor-wait disabled:opacity-80 " +
            (isHero
              ? "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_14px_32px_-12px_rgba(239,122,26,0.55)]"
              : meta.tone === "popular"
                ? "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_12px_28px_-12px_rgba(239,122,26,0.5)]"
                : "border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-3)]")
          }
        >
          {isPending ? (
            <>
              <Loader2 size={16} strokeWidth={2.5} className="animate-spin" aria-hidden />
              Abrindo checkout...
            </>
          ) : (
            <>
              Assinar {meta.tabLabel}
              <ArrowRight size={15} strokeWidth={2.5} aria-hidden />
            </>
          )}
        </button>

        {errorMsg && (
          <div className="relative mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[0.78125rem] text-red-700 dark:text-red-300">
            <AlertCircle size={14} strokeWidth={2} className="mt-0.5 flex-shrink-0" aria-hidden />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-[0.6875rem] leading-relaxed text-[color:var(--text-muted)]">
        Pagamento seguro. Cartão de crédito ou débito, Apple Pay e Google Pay.
      </p>
    </section>
  );
}
