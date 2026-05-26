import type { ReactNode } from "react";

import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";

type LegalShellProps = {
  title: string;
  /** Plain-language one-liner shown under the title. */
  intro: string;
  /** Human date string, e.g. "23 de maio de 2026". */
  updatedAt: string;
  children: ReactNode;
};

/**
 * Shared chrome + typography for the legal pages (/termos, /privacidade, /lgpd).
 * Mirrors the public page pattern: warm gradient, decorative blobs, header,
 * footer. Page bodies stay semantic HTML; styling lives in the prose wrapper.
 */
export function LegalShell({ title, intro, updatedAt, children }: LegalShellProps) {
  return (
    <div className="relative isolate min-h-screen bg-warm-gradient">
      <div aria-hidden className="bg-blob-top-right" />
      <div aria-hidden className="bg-blob-bottom-left" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-dots opacity-60"
      />

      <LandingHeader />

      <main id="conteudo" className="relative pb-24 pt-12 sm:pt-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <header className="border-b border-[color:var(--border-soft)] pb-8">
            <h1
              className="text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
              style={{ letterSpacing: "-0.035em" }}
            >
              {title}
            </h1>
            <p className="mt-4 text-base text-[color:var(--text-secondary)] sm:text-lg">
              {intro}
            </p>
            <p className="mt-4 text-xs text-[color:var(--text-muted)]">
              Última atualização: {updatedAt}
            </p>
          </header>

          <div
            className="legal-prose mt-10 text-[15px] leading-relaxed text-[color:var(--text-secondary)] [&_a]:font-medium [&_a]:text-[color:var(--color-brand-700)] [&_a:hover]:underline [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.02em] [&_h2]:text-[color:var(--text-primary)] [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[color:var(--text-primary)] [&_h2+p]:mt-4 [&_h3+p]:mt-3 [&_li]:mt-2 [&_li]:pl-1 [&_p]:mt-4 [&_strong]:font-semibold [&_strong]:text-[color:var(--text-primary)] [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
          >
            {children}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

/**
 * Identity block reused across the three legal pages so the controller data
 * stays consistent and is updated in one place.
 */
export function LegalIdentity() {
  return (
    <div className="mt-6 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-6 text-[14px] leading-relaxed text-[color:var(--text-secondary)] backdrop-blur-md">
      <p className="font-semibold text-[color:var(--text-primary)]">
        Arthur Fernandes de Oliveira Desenvolvimento de Software Ltda.
      </p>
      <p className="mt-1">CNPJ 55.234.268/0001-80</p>
      <p className="mt-1">
        Avenida Paulista, 1106, Bela Vista, São Paulo/SP, CEP 01310-914
      </p>
      <p className="mt-1">
        Contato:{" "}
        <a
          href="mailto:contato@saborfinanceiro.com.br"
          className="font-medium text-[color:var(--color-brand-700)] hover:underline"
        >
          contato@saborfinanceiro.com.br
        </a>
      </p>
    </div>
  );
}
