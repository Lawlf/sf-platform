import type { ReactNode } from "react";

export interface PageShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function PageShell({ children, title, description }: PageShellProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 pb-28 pt-6">
      {title ? (
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-brand-800)]">
            {title}
          </h1>
          {description ? <p className="text-sm opacity-80">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </main>
  );
}
