import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { SOCIAL_LINKS } from "@/app/_shared/brand-social";

import { PageShell } from "../../_components/page-shell";

export const metadata: Metadata = { title: "Sobre" };

export default function SobrePage() {
  return (
    <PageShell
      title="Sobre"
      description="O Sabor Financeiro e onde a gente anda."
      backHref={"/app/configuracoes" as Route}
    >
      <section className="flex flex-col gap-5 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-contain"
          />
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-[color:var(--color-brand-900)]">
              Sabor Financeiro
            </span>
            <span className="text-[0.8125rem] text-[color:var(--text-secondary)]">
              O mês inteiro do seu dinheiro.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            A gente mostra o mês inteiro do seu dinheiro, sem te obrigar a anotar
            cada gasto.
          </p>
          <Link
            href={"/app/configuracoes/sobre/por-que-existe" as Route}
            className="focus-ring inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)] hover:text-[color:var(--color-brand-800)]"
          >
            Por que o app existe
            <ArrowRight size={15} strokeWidth={2} aria-hidden />
          </Link>
        </div>

        <div className="flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-5">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Acompanhe a gente
          </span>
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--color-brand-700)] hover:text-[color:var(--color-brand-700)]"
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <p className="text-[0.75rem] text-[color:var(--text-muted)]">
          Feito no Brasil, com servidores em São Paulo.
        </p>
      </section>
    </PageShell>
  );
}
