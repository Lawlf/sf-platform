"use client";

import { Search, Star } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

import { TimelineMonthCalendar } from "./timeline-month-calendar";

export interface TimelineFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oldestUserDataIso: string | null;
}

const RANGE_OPTIONS = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
  { value: "24", label: "24 meses" },
  { value: "all", label: "Tudo" },
] as const;

const FOCUS_OPTIONS = [
  { value: "balance", label: "Saldo livre" },
  { value: "networth", label: "Patrimônio" },
  { value: "income", label: "Renda" },
] as const;

const SHOW_OPTIONS = [
  { value: "all", label: "Tudo" },
  { value: "highlights", label: "Só destaques", icon: Star },
  { value: "with-payments", label: "Com pagamentos" },
] as const;

export function TimelineFilterDrawer({
  open,
  onOpenChange,
  oldestUserDataIso,
}: TimelineFilterDrawerProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Local state for editing; only commits to URL on Apply
  const [range, setRange] = useState<string>(params.get("range") ?? "all");
  const [focus, setFocus] = useState<string>(params.get("focus") ?? "balance");
  const [show, setShow] = useState<string>(params.get("show") ?? "all");
  const [q, setQ] = useState<string>(params.get("q") ?? "");
  const [jumpTo, setJumpTo] = useState<string | null>(params.get("jumpTo"));

  function apply() {
    const next = new URLSearchParams();
    if (range !== "all") next.set("range", range);
    if (focus !== "balance") next.set("focus", focus);
    if (show !== "all") next.set("show", show);
    if (q.trim().length > 0) next.set("q", q.trim());
    if (jumpTo) next.set("jumpTo", jumpTo);
    const query = next.toString();
    const href = (
      query.length > 0 ? `/app/linha-do-tempo?${query}` : "/app/linha-do-tempo"
    ) as Route;
    startTransition(() => {
      router.push(href);
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-6 pb-8 pt-3">
        <div
          aria-hidden
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
        />

        <SheetHeader className="gap-1">
          <SheetTitle>Explorar linha do tempo</SheetTitle>
          <SheetDescription className="text-[12px] text-[color:var(--text-secondary)]">
            Busque um mês, filtre por foco ou ajuste o período.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5">
          <Search
            size={16}
            strokeWidth={2}
            className="text-[color:var(--text-muted)]"
            aria-hidden
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar mês ou conquista..."
            aria-label="Buscar"
            className="flex-1 border-none bg-transparent text-[14px] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
          />
        </div>

        <FilterSection title="Período">
          <ChipRow>
            {RANGE_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                active={range === opt.value}
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </FilterChip>
            ))}
          </ChipRow>
        </FilterSection>

        <FilterSection title="Ou escolha um mês">
          <TimelineMonthCalendar
            selectedIso={jumpTo}
            oldestUserDataIso={oldestUserDataIso}
            onSelect={(iso) => setJumpTo(iso)}
          />
        </FilterSection>

        <FilterSection title="Foco">
          <ChipRow>
            {FOCUS_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                active={focus === opt.value}
                onClick={() => setFocus(opt.value)}
              >
                {opt.label}
              </FilterChip>
            ))}
          </ChipRow>
        </FilterSection>

        <FilterSection title="Mostrar">
          <ChipRow>
            {SHOW_OPTIONS.map((opt) => {
              const Icon = "icon" in opt ? opt.icon : null;
              return (
                <FilterChip
                  key={opt.value}
                  active={show === opt.value}
                  onClick={() => setShow(opt.value)}
                >
                  {Icon ? <Icon size={12} strokeWidth={2} aria-hidden /> : null}
                  {opt.label}
                </FilterChip>
              );
            })}
          </ChipRow>
        </FilterSection>

        <button
          type="button"
          onClick={apply}
          disabled={pending}
          aria-busy={pending || undefined}
          className="focus-ring relative mt-6 flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className={pending ? "opacity-0" : "opacity-100"}>Aplicar filtros</span>
          {pending ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner size={18} />
            </span>
          ) : null}
        </button>
      </SheetContent>
    </Sheet>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.6px] text-[color:var(--text-muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
        active
          ? "border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
          : "border border-transparent bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)]"
      }`}
    >
      {children}
    </button>
  );
}
