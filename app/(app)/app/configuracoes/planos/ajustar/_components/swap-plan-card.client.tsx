"use client";

import { ArrowRight, Check, Crown, Infinity as InfinityIcon, Lock, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { StepUpGate } from "@/app/(app)/app/_components/step-up/step-up-gate.client";
import { Spinner } from "@/app/components/ui/spinner";
import type { Plan } from "@/domain/entities/plan.entity";

import { startCheckoutAction } from "../../_actions/start-checkout.action";
import { swapPlanAction } from "../../_actions/swap-plan.action";

interface Props {
  plan: Plan;
  isCurrent: boolean;
  blocked: boolean;
  blockedReason: string | null;
  iconName: "crown" | "sparkles" | "infinity";
}

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function iconFor(name: Props["iconName"]) {
  if (name === "infinity") return InfinityIcon;
  if (name === "sparkles") return Sparkles;
  return Crown;
}

function cadenceLabel(interval: Plan["billingInterval"]) {
  if (interval === "month") return "por mês";
  if (interval === "year") return "por ano";
  return "pagamento único";
}

function intervalTitle(interval: Plan["billingInterval"]) {
  if (interval === "month") return "Mensal";
  if (interval === "year") return "Anual";
  return "Vitalício";
}

export function SwapPlanCard({ plan, isCurrent, blocked, blockedReason, iconName }: Props) {
  const [pending, startTransition] = useTransition();
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const Icon = iconFor(iconName);
  const price = fmtBRL.format(Number(plan.priceCents) / 100);
  const cadence = cadenceLabel(plan.billingInterval);
  const title = intervalTitle(plan.billingInterval);
  const isLifetime = plan.billingInterval === "lifetime";

  async function doSwap(slug: string) {
    if (isLifetime) {
      const r = await startCheckoutAction(slug);
      if (r && r.ok === false) {
        toast.error("Não rolou abrir checkout.", { description: r.message });
      }
      return;
    }
    const r = await swapPlanAction(slug);
    if (r.ok && r.data.stepupRequired) {
      setPendingSlug(slug);
      setStepUpOpen(true);
      return;
    }
    if (r.ok) {
      toast.success(`Trocado pra ${title}.`, {
        description: "A gente só cobra a diferença proporcional aos dias que faltavam.",
      });
    } else {
      toast.error("Não rolou trocar plano.", {
        description: r.message ?? "Tenta de novo em instantes.",
      });
    }
  }

  function handleClick() {
    if (isCurrent || blocked) return;
    startTransition(async () => {
      await doSwap(plan.slug);
    });
  }

  function handleStepUpConfirmed() {
    setStepUpOpen(false);
    if (!pendingSlug) return;
    const slug = pendingSlug;
    setPendingSlug(null);
    startTransition(async () => {
      const r = await swapPlanAction(slug);
      if (r.ok && !r.data.stepupRequired) {
        toast.success(`Trocado pra ${title}.`, {
          description: "A gente só cobra a diferença proporcional aos dias que faltavam.",
        });
      } else {
        toast.error("Não rolou trocar plano.", {
          description: r.ok
            ? "Confirme sua identidade para continuar."
            : r.message ?? "Tenta de novo em instantes.",
        });
      }
    });
  }

  const buttonLabel = isCurrent
    ? "Plano atual"
    : blocked
      ? blockedReason ?? "Indisponível"
      : isLifetime
        ? "Comprar vitalício"
        : "Trocar pra esse";

  return (
    <>
      <article
        className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${
          isCurrent
            ? "border-[color:var(--color-brand-500)]/40 bg-[linear-gradient(135deg,rgba(242,142,37,0.12),rgba(239,122,26,0.04))]"
            : blocked
              ? "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]/50 opacity-70"
              : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-2)]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isCurrent
                  ? "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white"
                  : "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]"
              }`}
            >
              <Icon size={18} strokeWidth={2.2} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-[1rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {title}
              </h3>
              <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
                {plan.name}
              </p>
            </div>
          </div>

          {isCurrent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-brand-500)]/15 px-2 py-1 text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
              <Check size={11} strokeWidth={2.6} aria-hidden />
              atual
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <p className="text-[1.75rem] font-extrabold leading-none text-[color:var(--text-primary)] tabular-nums">
            {price}
          </p>
          <p className="text-[0.75rem] text-[color:var(--text-secondary)]">{cadence}</p>
        </div>

        {plan.billingInterval === "year" && (
          <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
            Equivale a {fmtBRL.format(Number(plan.priceCents) / 12 / 100)} por mês.
          </p>
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={isCurrent || blocked || pending}
          aria-busy={pending || undefined}
          className={`focus-ring relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[0.8125rem] font-bold transition-colors ${
            isCurrent
              ? "cursor-default bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"
              : blocked
                ? "cursor-not-allowed bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"
                : "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_10px_24px_-12px_rgba(239,122,26,0.55)] hover:brightness-105 disabled:opacity-80"
          }`}
        >
          <span
            className={`inline-flex items-center gap-2 transition-opacity ${
              pending ? "opacity-0" : "opacity-100"
            }`}
          >
            {blocked && !isCurrent && <Lock size={13} strokeWidth={2.2} aria-hidden />}
            {buttonLabel}
            {!isCurrent && !blocked && <ArrowRight size={14} strokeWidth={2.2} aria-hidden />}
          </span>
          {pending ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Spinner size={16} />
            </span>
          ) : null}
        </button>
      </article>

      <StepUpGate
        open={stepUpOpen}
        onOpenChange={setStepUpOpen}
        onConfirmed={handleStepUpConfirmed}
        title="Confirme para trocar plano"
      />
    </>
  );
}
