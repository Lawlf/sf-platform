"use client";

import { BellRing, Crown, Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { DebtDuePushToggle } from "./debt-due-push-toggle.client";

interface Props {
  isPro: boolean;
  initialEnabled: boolean;
  initialDaysBefore: number;
}

export function DebtDueReminderCard({ isPro, initialEnabled, initialDaysBefore }: Props) {
  return (
    <section className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <BellRing size={17} strokeWidth={1.9} aria-hidden />
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
              Avisos de vencimento
            </h2>
            {!isPro ? (
              <Lock
                size={13}
                strokeWidth={2.25}
                className="text-[color:var(--text-muted)]"
                aria-hidden
              />
            ) : null}
          </div>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Receba um aviso quando uma parcela estiver perto de vencer. Você escolhe com quanta
            antecedência.
          </p>
        </div>
      </div>

      {isPro ? (
        <div className="mt-4">
          <DebtDuePushToggle
            initialEnabled={initialEnabled}
            initialDaysBefore={initialDaysBefore}
            scopeNote='Para colocar um vencimento específico na sua agenda, abra a dívida e use "adicionar ao calendário".'
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-[color:var(--surface-2)] p-3">
          <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Os vencimentos próximos já aparecem aqui na tela. O Pro manda o lembrete pro seu celular,
            por push e email, sem você precisar abrir o app.
          </p>
          <Link
            href={"/app/configuracoes/planos" as Route}
            className="focus-ring inline-flex w-fit items-center gap-1 text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
          >
            Virar Pro
            <Crown size={13} strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}
