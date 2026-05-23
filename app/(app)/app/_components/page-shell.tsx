import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export interface PageShellProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  blob?: "warm" | "none";
  layout?: "stack" | "grid";
  backHref?: Route;
  backLabel?: string;
}

export function PageShell({
  children,
  title,
  description,
  blob = "warm",
  layout = "stack",
  backHref,
  backLabel = "Voltar",
}: PageShellProps) {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 pb-28 pt-6 md:max-w-2xl lg:max-w-4xl">
      {blob === "warm" ? <div className="bg-blob-top-right" aria-hidden /> : null}
      {backHref ? (
        <Link
          href={backHref}
          className="focus-ring relative inline-flex w-fit items-center gap-1.5 rounded-full bg-[color:var(--surface-1)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--text-secondary)] backdrop-blur-sm transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
        >
          <ArrowLeft size={14} strokeWidth={2} aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      {title ? (
        <header className="relative flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)] md:text-3xl">
            {title}
          </h1>
          {description ? (
            typeof description === "string" ? (
              <p className="text-sm text-[color:var(--text-secondary)]">{description}</p>
            ) : (
              <div className="text-sm text-[color:var(--text-secondary)]">{description}</div>
            )
          ) : null}
        </header>
      ) : null}
      <div
        className={`relative ${
          layout === "grid" ? "grid gap-4 md:grid-cols-2" : "flex flex-col gap-4"
        }`}
      >
        {children}
      </div>
    </main>
  );
}
