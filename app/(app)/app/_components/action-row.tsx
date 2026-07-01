import type { Route } from "next";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ActionRowProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: "default" | "danger" | "primary";
  href?: Route;
  onClick?: () => void;
  trailing?: ReactNode;
}

function rowClass(tone: "default" | "danger" | "primary"): string {
  return cn(
    "focus-ring flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
    tone === "primary"
      ? "bg-[color:var(--color-brand-500)]/[0.08] hover:bg-[color:var(--color-brand-500)]/[0.14]"
      : "hover:bg-[color:var(--surface-2)]",
  );
}

export function ActionRow({
  icon: Icon,
  title,
  subtitle,
  tone = "default",
  href,
  onClick,
  trailing,
}: ActionRowProps) {
  const isDanger = tone === "danger";
  const isPrimary = tone === "primary";
  const content = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isDanger
            ? "bg-[color:var(--semantic-negative)]/12 text-[color:var(--semantic-negative)]"
            : isPrimary
              ? "bg-[color:var(--color-brand-500)] text-white"
              : "bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]",
        )}
      >
        <Icon size={18} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[0.875rem] font-semibold",
            isDanger
              ? "text-[color:var(--semantic-negative)]"
              : isPrimary
                ? "text-[color:var(--color-brand-800)]"
                : "text-[color:var(--text-primary)]",
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[0.75rem] text-[color:var(--text-secondary)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing ?? (
        <ChevronRight
          size={18}
          strokeWidth={2}
          className="shrink-0 text-[color:var(--text-muted)]"
          aria-hidden
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClass(tone)}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass(tone)}>
        {content}
      </button>
    );
  }

  return <div className={rowClass(tone)}>{content}</div>;
}

export function ActionRowGroup({ children }: { children: ReactNode }) {
  return (
    <section className="divide-y divide-[color:var(--border-soft)] overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-xl">
      {children}
    </section>
  );
}
