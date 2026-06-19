import { ArrowRight, Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function HouseholdPaywallCard() {
  return (
    <section
      aria-label="Visão conjunta da casa"
      className="relative overflow-hidden rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, rgba(242,142,37,0.16), transparent 60%)",
      }}
    >
      <span
        className="mb-3 grid h-10 w-10 place-items-center rounded-xl text-white"
        style={{
          background: "linear-gradient(135deg,#f28e25,#ef7a1a)",
          boxShadow: "0 8px 18px -6px rgba(239,122,26,0.55)",
        }}
      >
        <Lock size={18} strokeWidth={2.2} aria-hidden />
      </span>

      <h2 className="text-[1.0625rem] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
        A casa inteira numa tela só.
      </h2>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        Renda, dívida e patrimônio de vocês dois, somados. E a recomendação de qual conta o casal
        quita primeiro.
      </p>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        No Pro por R$ 19,90/mês. Quem você convidou continua de graça.
      </p>

      <Link
        href={"/app/configuracoes/planos" as Route}
        className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[0.84375rem] font-bold text-white"
        style={{ boxShadow: "0 10px 24px -8px rgba(239,122,26,0.5)" }}
      >
        Conhecer o Pro
        <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
      </Link>
    </section>
  );
}
