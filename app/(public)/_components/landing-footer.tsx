import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { SOCIAL_LINKS } from "@/app/_shared/brand-social";

const groups = [
  {
    label: "Produto",
    links: [
      { label: "Funcionalidades", href: "#produto" },
      { label: "Como funciona", href: "#como" },
      { label: "Por que existe", href: "/por-que-existe" },
      { label: "Privacidade", href: "#privacidade" },
      { label: "Preços", href: "#precos" },
      { label: "Dúvidas", href: "#faq" },
      { label: "Entrar", href: "/entrar" },
    ],
  },
  {
    label: "Recursos",
    links: [
      { label: "Calculadoras", href: "/calculadora" },
      { label: "Comparar apps", href: "/alternativas" },
      { label: "Finanças com IA", href: "/financas-com-ia" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Termos de uso", href: "/termos" },
      { label: "Política de privacidade", href: "/privacidade" },
      { label: "LGPD", href: "/lgpd" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="relative border-t border-[color:var(--border-soft)] pt-14 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/icons/icon-192.png"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-contain"
              />
              <span
                className="text-base font-extrabold tracking-tight text-[color:var(--color-brand-900)]"
                style={{ letterSpacing: "-0.02em" }}
              >
                Sabor Financeiro
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[color:var(--text-secondary)]">
              Saúde financeira com lente macro. Pra quem quer entender o
              tamanho real do buraco e o caminho pra sair dele, sem precisar
              anotar cada cafezinho.
            </p>
            <p className="mt-4 text-xs text-[color:var(--text-muted)]">
              Funciona no navegador, no celular e no computador. Coloca o ícone
              na tela inicial e abre como qualquer app, no Android ou no iPhone.
            </p>
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              Feito no Brasil. Servidores em São Paulo.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--color-brand-700)] hover:text-[color:var(--color-brand-700)]"
                >
                  <social.icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {groups.map((group) => (
            <div key={group.label}>
              <h2
                id={`footer-${group.label}`}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
              >
                {group.label}
              </h2>
              <ul className="mt-4 space-y-3" aria-labelledby={`footer-${group.label}`}>
                {group.links.map((link) => (
                  <li key={`${group.label}-${link.label}`}>
                    <Link
                      href={link.href as Route}
                      className="text-sm text-[color:var(--text-primary)] hover:text-[color:var(--color-brand-700)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col-reverse gap-4 border-t border-[color:var(--border-soft)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[color:var(--text-muted)]">
            © {new Date().getFullYear()} Sabor Financeiro. Feito no Brasil.
          </p>
          <p className="text-xs text-[color:var(--text-muted)]">
            saborfinanceiro.com.br
          </p>
        </div>
      </div>
    </footer>
  );
}
