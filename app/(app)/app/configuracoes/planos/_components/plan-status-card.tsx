"use client";

import { Crown, Infinity as InfinityIcon, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Spinner } from "@/app/components/ui/spinner";
import type { Subscription } from "@/domain/entities/subscription.entity";

import { reactivateSubscriptionAction } from "../_actions/reactivate-subscription.action";

type BillingInterval = "month" | "year" | "lifetime";

interface Props {
  sub: Subscription | null;
  priceCents: number;
  interval: BillingInterval | null;
}

const fmtCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const fmtDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const LIFETIME_PERIOD_END = new Date("2099-12-31T23:59:59Z");

function isLifetime(sub: Subscription): boolean {
  return sub.currentPeriodEnd.getTime() >= LIFETIME_PERIOD_END.getTime() - 86400000;
}

function planLabel(interval: BillingInterval | null, lifetime: boolean): string {
  if (lifetime || interval === "lifetime") return "Pro vitalício";
  if (interval === "year") return "Pro anual";
  return "Pro mensal";
}

export function PlanStatusCard({ sub, priceCents, interval }: Props) {
  const [reactivatePending, startReactivate] = useTransition();
  const isPro = sub !== null && (sub.status === "active" || sub.status === "past_due");

  function handleReactivate() {
    startReactivate(async () => {
      const r = await reactivateSubscriptionAction();
      if (r.ok) {
        toast.success("Pro reativado.", { description: "Renovação automática voltou." });
      } else {
        toast.error("Não rolou reativar.", {
          description: r.message ?? "Tenta de novo em instantes.",
        });
      }
    });
  }

  if (!sub || !isPro) {
    return (
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"
          aria-hidden
        >
          <Crown size={16} strokeWidth={2} />
        </span>
        <div>
          <p className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
            Plano Free
          </p>
          <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
            Escolha um plano Pro abaixo pra desbloquear tudo.
          </p>
        </div>
      </div>
    );
  }

  const lifetime = isLifetime(sub) || interval === "lifetime";
  const label = planLabel(interval, lifetime);
  const priceLabel = fmtCurrency.format(priceCents / 100);
  const Icon = lifetime ? InfinityIcon : Sparkles;
  const cadenceSuffix = interval === "year" ? "/ano" : "/mês";

  const subline = lifetime
    ? "Acesso pra sempre · pagamento único"
    : sub.cancelAtPeriodEnd
      ? `Cancela em ${fmtDate.format(sub.currentPeriodEnd)} · ${priceLabel}`
      : `Renova em ${fmtDate.format(sub.currentPeriodEnd)} · ${priceLabel}${cadenceSuffix}`;

  const showAdjust = sub.provider === "stripe" && !lifetime;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white"
            aria-hidden
          >
            <Icon size={16} strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
              {label}
            </p>
            <p className="truncate text-[0.75rem] text-[color:var(--text-secondary)]">
              {subline}
            </p>
          </div>
        </div>

        {showAdjust && (
          <Link
            href={"/app/configuracoes/planos/ajustar" as Route}
            className="focus-ring inline-flex flex-shrink-0 items-center rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.75rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            Ajustar plano
          </Link>
        )}
      </div>

      {sub.provider === "manual" && (
        <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
          Plano manual (cortesia). Para alterar, fale com o suporte.
        </p>
      )}

      {sub.cancelAtPeriodEnd && sub.provider === "stripe" && !lifetime && (
        <button
          type="button"
          onClick={handleReactivate}
          disabled={reactivatePending}
          aria-busy={reactivatePending || undefined}
          className="sf-lift focus-ring relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-2.5 text-[0.8125rem] font-bold text-white shadow-[0_10px_24px_-12px_rgba(239,122,26,0.55)] disabled:opacity-80"
        >
          <span
            className={`inline-flex items-center gap-2 transition-opacity ${
              reactivatePending ? "opacity-0" : "opacity-100"
            }`}
          >
            <Sparkles size={14} strokeWidth={2.4} aria-hidden />
            Reativar assinatura
          </span>
          {reactivatePending ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Spinner size={16} />
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
}
