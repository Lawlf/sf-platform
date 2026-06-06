import type { Route } from "next";
import type { ReactNode } from "react";

import { BackButton } from "./back-button.client";

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
    <main className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-6 md:max-w-2xl md:pb-12 lg:max-w-4xl">
      {blob === "warm" ? <div className="bg-blob-top-right" aria-hidden /> : null}
      {backHref ? <BackButton fallbackHref={backHref} label={backLabel} /> : null}
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
