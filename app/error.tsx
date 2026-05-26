"use client";

import { ArrowLeft, RefreshCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
    // Move focus to the error heading so screen-reader users are told the page failed.
    headingRef.current?.focus();
  }, [error]);

  return (
    <main
      data-theme="dark"
      className="relative isolate min-h-screen overflow-hidden bg-[color:var(--bg-app)] text-[color:var(--text-primary)]"
    >
      <div aria-hidden className="bg-blob-top-right" />
      <div aria-hidden className="bg-blob-bottom-left" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-dots opacity-60"
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-20 sm:px-6">
        <div className="relative">
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_16px_36px_-10px_rgba(220,38,38,0.45)] sm:h-20 sm:w-20"
            style={{
              background:
                "linear-gradient(135deg, var(--color-negative), var(--color-brand-700))",
            }}
          >
            <TriangleAlert
              className="h-8 w-8 text-white sm:h-9 sm:w-9"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(220,38,38,0.25), transparent 70%)",
            }}
          />
        </div>

        <p className="mt-8 text-[12px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-negative)]">
          Algo deu errado
        </p>

        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-3 text-[40px] font-extrabold leading-[1.02] text-[color:var(--text-primary)] outline-none sm:text-[56px] lg:text-[64px]"
          style={{ letterSpacing: "-0.04em" }}
        >
          Essa página não carregou.
        </h1>

        <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-[color:var(--text-secondary)] sm:text-[18px]">
          Tenta recarregar em instantes. Se o erro continuar, a gente quer
          saber.
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => reset()}
            className="sf-lift focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(239,122,26,0.5)]"
          >
            <RefreshCcw className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Tentar de novo
          </button>
          <Link
            href="/"
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Voltar pra página inicial
          </Link>
        </div>

        {error.digest ? (
          <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-1.5 text-[11px] font-medium text-[color:var(--text-muted)] backdrop-blur w-fit">
            Código do erro:
            <span className="font-mono text-[color:var(--text-secondary)]">
              {error.digest}
            </span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
