import { ChevronRight, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface MaisCardProps {
  href: Route;
  icon: LucideIcon;
  title: string;
  description: string;
}

export function MaisCard({ href, icon: Icon, title, description }: MaisCardProps) {
  return (
    <Link
      href={href}
      className="focus-ring flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)]"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Icon size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="block">
          <span className="block text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            {title}
          </span>
          <span className="block mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
            {description}
          </span>
        </span>
      </span>
      <ChevronRight
        size={18}
        strokeWidth={2}
        className="text-[color:var(--color-brand-800)]"
        aria-hidden
      />
    </Link>
  );
}
