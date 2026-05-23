import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

const SHORTCUTS = [
  { href: "/", label: "Página inicial" },
  { href: "/precos", label: "Preços e comparação" },
  { href: "/entrar", label: "Entrar" },
  { href: "/cadastrar", label: "Criar conta grátis" },
] as const;

export default function NotFound() {
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
          <span
            aria-hidden
            className="block select-none text-[120px] font-extrabold leading-none text-transparent sm:text-[180px] lg:text-[220px]"
            style={{
              letterSpacing: "-0.06em",
              WebkitTextStroke: "1.5px var(--color-brand-500)",
              backgroundImage:
                "linear-gradient(135deg, rgba(242,142,37,0.12), rgba(186,87,23,0.06))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            404
          </span>
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 right-0 h-40 w-40 rounded-full opacity-60 blur-3xl sm:h-60 sm:w-60"
            style={{
              background:
                "radial-gradient(circle, rgba(242,142,37,0.35), transparent 70%)",
            }}
          />
        </div>

        <h1
          className="-mt-2 text-[40px] font-extrabold leading-[1.02] text-[color:var(--text-primary)] sm:text-[56px] lg:text-[64px]"
          style={{ letterSpacing: "-0.04em" }}
        >
          Endereço perdido.
          <br />
          <span className="text-[color:var(--text-secondary)]">
            A gente não achou nada aqui.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-[color:var(--text-secondary)] sm:text-[18px]">
          Essa página pode ter mudado de lugar, nunca ter existido, ou ainda
          estar em construção. Em todo caso, abaixo tem o caminho de volta.
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="sf-lift focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(239,122,26,0.5)]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Voltar pra página inicial
          </Link>
          <Link
            href="/precos"
            className="focus-ring inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          >
            Ver os planos
          </Link>
        </div>

        <div className="mt-12 border-t border-[color:var(--border-soft)] pt-6">
          <p className="text-[12px] font-medium text-[color:var(--text-muted)]">
            Onde você queria ir?
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SHORTCUTS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="focus-ring sf-lift flex items-center justify-between rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-[14.5px] font-semibold text-[color:var(--text-primary)] backdrop-blur"
                >
                  <span>{item.label}</span>
                  <ArrowRight
                    className="h-4 w-4 text-[color:var(--color-brand-700)]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
