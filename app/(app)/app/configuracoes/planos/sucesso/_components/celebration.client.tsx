"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Crown,
  Infinity as InfinityIcon,
  Sparkles,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Spinner } from "@/app/components/ui/spinner";

interface Props {
  isActive: boolean;
  isLifetime: boolean;
  priceCents: number;
  periodEndIso: string | null;
  sessionId: string | null;
  userName: string | null;
}

const FEATURES = [
  "Cockpit completo (renda, patrimônio, dívidas)",
  "Linha do tempo macro mensal",
  "Simulações ilimitadas",
  "Conteúdo bloqueado liberado",
] as const;

const CONFETTI = Array.from({ length: 42 }, (_, i) => i);
const PALETTE = ["#f28e25", "#ef7a1a", "#fbbf24", "#f97316", "#fde68a", "#fff7ed"];

const fmtCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const fmtDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function CelebrationClient({
  isActive,
  isLifetime,
  priceCents,
  periodEndIso,
  sessionId,
  userName,
}: Props) {
  const router = useRouter();
  const [pollCount, setPollCount] = useState(0);
  const firstName = userName?.split(" ")[0] ?? null;

  useEffect(() => {
    if (isActive) return;
    if (pollCount >= 12) return;
    const t = setTimeout(() => {
      router.refresh();
      setPollCount((n) => n + 1);
    }, 2000);
    return () => clearTimeout(t);
  }, [isActive, pollCount, router]);

  const confetti = useMemo(
    () =>
      CONFETTI.map((i) => ({
        i,
        left: `${(i * 97) % 100}%`,
        delay: `${(i % 10) * 0.08 + 0.2}s`,
        duration: `${1.6 + ((i * 13) % 12) / 10}s`,
        rotate: `${(i * 47) % 360}deg`,
        color: PALETTE[i % PALETTE.length],
        size: 6 + (i % 4) * 2,
      })),
    [],
  );

  if (!isActive) {
    return (
      <main className="relative flex min-h-screen w-full flex-col items-center justify-center px-6 text-center">
        <div className="bg-blob-top-right" aria-hidden />
        <div className="relative flex flex-col items-center gap-5 rounded-3xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-8 py-10 backdrop-blur-xl">
          <Spinner size={36} className="text-[color:var(--color-brand-700)]" />
          <div className="space-y-2">
            <h1 className="text-[1.375rem] font-extrabold tracking-tight text-[color:var(--text-primary)]">
              Confirmando seu pagamento
            </h1>
            <p className="max-w-xs text-[0.8125rem] text-[color:var(--text-secondary)]">
              Stripe confirmou. Estamos liberando seu acesso Pro nos próximos segundos.
            </p>
          </div>
          {pollCount >= 12 && (
            <Link
              href={"/app/configuracoes/planos" as Route}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-2)] px-4 py-2 text-[0.75rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
            >
              Demorou? Atualize manualmente
            </Link>
          )}
          {sessionId && (
            <p className="font-mono text-[0.625rem] uppercase tracking-wider text-[color:var(--text-muted)]">
              ref {sessionId.slice(-12)}
            </p>
          )}
        </div>
      </main>
    );
  }

  const priceLabel = fmtCurrency.format(priceCents / 100);
  const cadence = isLifetime ? "uma vez. pra sempre." : "por mês. cancela quando quiser.";
  const periodEnd = periodEndIso ? new Date(periodEndIso) : null;

  return (
    <main className="relative isolate flex min-h-screen w-full flex-col overflow-hidden">
      <style>{celebrationCss}</style>

      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-10%,rgba(242,142,37,0.35),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_120%,rgba(239,122,26,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:repeating-linear-gradient(45deg,#000_0_1px,transparent_1px_3px)]" />
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] overflow-hidden">
        {confetti.map((c) => (
          <span
            key={c.i}
            className="sf-confetti absolute -top-6 block"
            style={{
              left: c.left,
              width: c.size,
              height: c.size * 1.6,
              background: c.color,
              animationDelay: c.delay,
              animationDuration: c.duration,
              transform: `rotate(${c.rotate})`,
              borderRadius: c.i % 3 === 0 ? "9999px" : "1px",
            }}
          />
        ))}
      </div>

      <Link
        href={"/app/configuracoes/planos" as Route}
        className="focus-ring absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-1)]/80 px-3 py-1.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)] backdrop-blur-md transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)] md:left-8 md:top-8"
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
        Voltar
      </Link>

      <section className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="sf-reveal-1 relative">
          <div className="absolute inset-0 -z-10 blur-2xl">
            <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(242,142,37,0.55),transparent_70%)]" />
          </div>
          <div className="sf-crown-pop relative flex h-24 w-24 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_28px_60px_-18px_rgba(239,122,26,0.7)]">
            {isLifetime ? (
              <InfinityIcon size={44} strokeWidth={2.4} aria-hidden />
            ) : (
              <Crown size={44} strokeWidth={2.4} aria-hidden />
            )}
          </div>
        </div>

        <p className="sf-reveal-2 mt-7 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/10 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[1.2px] text-[color:var(--color-brand-800)]">
          <Sparkles size={11} strokeWidth={2.5} aria-hidden />
          {firstName ? `bora, ${firstName.toLowerCase()}` : "pagamento confirmado"}
        </p>

        <h1 className="sf-reveal-3 mt-5 text-balance text-[2.5rem] font-black leading-[0.95] tracking-tight text-[color:var(--text-primary)] md:text-[3.5rem]">
          Bem-vindo ao{" "}
          <span className="relative inline-block">
            <span className="relative z-10 bg-[linear-gradient(135deg,#f28e25,#ef7a1a,#d9650a)] bg-clip-text text-transparent">
              Pro
            </span>
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 right-0 h-2 origin-left rounded-full bg-[linear-gradient(90deg,#f28e25,#ef7a1a)] opacity-25 sf-underline"
            />
          </span>
          .
        </h1>

        <p className="sf-reveal-4 mt-4 max-w-md text-[0.9375rem] leading-relaxed text-[color:var(--text-secondary)]">
          Tudo liberado. Agora você vê patrimônio, dívida e renda no mesmo lugar, mês a mês.
        </p>

        <div className="sf-reveal-5 mt-8 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
          {FEATURES.map((f, idx) => (
            <div
              key={f}
              className="sf-feature flex items-center gap-2.5 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)]/70 px-3.5 py-2.5 text-left text-[0.8125rem] font-medium text-[color:var(--text-primary)] backdrop-blur-md"
              style={{ animationDelay: `${0.7 + idx * 0.08}s` }}
            >
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]">
                <Check size={12} strokeWidth={3} aria-hidden />
              </span>
              {f}
            </div>
          ))}
        </div>

        <div className="sf-reveal-6 mt-8 flex w-full max-w-md flex-col gap-3 rounded-3xl border border-[color:var(--color-brand-500)]/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.85),rgba(255,247,237,0.7))] p-5 text-left backdrop-blur-xl dark:bg-[linear-gradient(135deg,rgba(40,30,20,0.6),rgba(60,35,15,0.4))]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[0.625rem] font-bold uppercase tracking-[1px] text-[color:var(--text-muted)]">
              Você pagou
            </p>
            <p className="text-[0.6875rem] text-[color:var(--text-secondary)]">{cadence}</p>
          </div>
          <p className="text-[2.5rem] font-black leading-none tracking-tight text-[color:var(--text-primary)] tabular-nums">
            {priceLabel}
          </p>
          {periodEnd && !isLifetime && (
            <p className="inline-flex items-center gap-1.5 text-[0.75rem] text-[color:var(--text-secondary)]">
              <CalendarClock size={13} strokeWidth={2} aria-hidden />
              Próxima cobrança em <strong className="font-bold text-[color:var(--text-primary)]">{fmtDate.format(periodEnd)}</strong>
            </p>
          )}
          {isLifetime && (
            <p className="inline-flex items-center gap-1.5 text-[0.75rem] text-[color:var(--text-secondary)]">
              <InfinityIcon size={13} strokeWidth={2} aria-hidden />
              Acesso vitalício. Sem renovação, sem surpresa.
            </p>
          )}
        </div>

        <div className="sf-reveal-7 mt-8 flex w-full max-w-md flex-col gap-2.5">
          <Link
            href={"/app" as Route}
            className="sf-lift focus-ring group inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3.5 text-[0.9375rem] font-bold text-white shadow-[0_18px_40px_-14px_rgba(239,122,26,0.65)] transition-all"
          >
            Bora pro app
            <ArrowRight
              size={16}
              strokeWidth={2.5}
              className="transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <Link
            href={"/app/configuracoes/planos" as Route}
            className="focus-ring inline-flex items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-5 py-3 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] backdrop-blur-md transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
          >
            Ver meu plano
          </Link>
        </div>

        {sessionId && (
          <p className="sf-reveal-7 mt-6 font-mono text-[0.625rem] uppercase tracking-wider text-[color:var(--text-muted)]">
            ref {sessionId.slice(-12)}
          </p>
        )}
      </section>
    </main>
  );
}

const celebrationCss = `
@keyframes sf-confetti-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translateY(70vh) rotate(540deg); opacity: 0; }
}
@keyframes sf-crown-pop {
  0% { transform: scale(0.3) rotate(-12deg); opacity: 0; }
  60% { transform: scale(1.15) rotate(4deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes sf-rise {
  0% { transform: translateY(14px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes sf-underline-grow {
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}
.sf-confetti {
  animation: sf-confetti-fall linear forwards;
  will-change: transform, opacity;
}
.sf-crown-pop { animation: sf-crown-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.sf-reveal-1 { animation: sf-rise 0.5s ease-out 0.05s both; }
.sf-reveal-2 { animation: sf-rise 0.5s ease-out 0.25s both; }
.sf-reveal-3 { animation: sf-rise 0.5s ease-out 0.35s both; }
.sf-reveal-4 { animation: sf-rise 0.5s ease-out 0.5s both; }
.sf-reveal-5 { animation: sf-rise 0.5s ease-out 0.6s both; }
.sf-reveal-6 { animation: sf-rise 0.6s ease-out 0.85s both; }
.sf-reveal-7 { animation: sf-rise 0.6s ease-out 1s both; }
.sf-feature { animation: sf-rise 0.5s ease-out both; }
.sf-underline { animation: sf-underline-grow 0.7s ease-out 0.9s both; }
@media (prefers-reduced-motion: reduce) {
  .sf-confetti, .sf-crown-pop, .sf-reveal-1, .sf-reveal-2, .sf-reveal-3,
  .sf-reveal-4, .sf-reveal-5, .sf-reveal-6, .sf-reveal-7, .sf-feature, .sf-underline {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`;
