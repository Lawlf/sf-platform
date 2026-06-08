import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";

export default function AppNotFound() {
  return (
    <main className="relative mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-start justify-center gap-5 px-4 py-16 md:max-w-2xl">
      <div className="bg-blob-top-right" aria-hidden />
      <span
        aria-hidden
        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[color:var(--color-brand-500)]"
      >
        <Compass className="h-6 w-6" strokeWidth={2} />
      </span>
      <div className="relative flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)] md:text-3xl">
          Não achamos essa página.
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
          O endereço pode ter mudado, ou o item que você procurava foi removido.
          Você continua logado, é só voltar.
        </p>
      </div>
      <Link
        href="/app"
        className="sf-lift focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(239,122,26,0.5)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        Voltar pro início
      </Link>
    </main>
  );
}
