"use client";

import { Check, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { FLAIR_CATALOG } from "@/domain/services/profile-identity.service";

import { getProfileBadgeIcon } from "../../_components/profile-badge-icons";
import { setFlairAction } from "../_actions/set-flair.action";

export function FlairPicker({ initialFlair }: { initialFlair: string | null }) {
  const [selected, setSelected] = useState<string | null>(initialFlair);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(key: string | null) {
    const prev = selected;
    setSelected(key);
    setOpen(false);
    startTransition(async () => {
      const result = await setFlairAction(key);
      if (!result.ok) setSelected(prev);
    });
  }

  const current = selected ? (FLAIR_CATALOG.find((f) => f.key === selected) ?? null) : null;
  const CurrentIcon = current ? getProfileBadgeIcon(current.iconName) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring mt-3 flex w-full items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-left backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[color:var(--color-brand-500)]/[0.16] text-[color:var(--color-brand-800)]">
          {CurrentIcon ? (
            <CurrentIcon size={18} strokeWidth={1.75} aria-hidden />
          ) : (
            <Sparkles size={18} strokeWidth={1.75} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Seu estilo com dinheiro
          </span>
          <span className="block truncate text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            {current ? current.label : "Escolher meu estilo com dinheiro"}
          </span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
          <SheetHeader className="gap-1">
            <SheetTitle>Seu estilo com dinheiro</SheetTitle>
            <SheetDescription className="text-[0.75rem] text-[color:var(--text-secondary)]">
              Escolha o que mais combina com você. Não muda nada nas suas contas, é só como você aparece.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-2">
            {FLAIR_CATALOG.map((f) => {
              const Icon = getProfileBadgeIcon(f.iconName);
              const active = selected === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => choose(f.key)}
                  disabled={pending}
                  aria-pressed={active}
                  className={`focus-ring flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-60 ${
                    active
                      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.08]"
                      : "border-[color:var(--border-soft)] bg-[color:var(--surface-2)]"
                  }`}
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9rem] font-bold text-[color:var(--text-primary)]">
                      {f.label}
                    </span>
                    <span className="block text-[0.75rem] text-[color:var(--text-muted)]">
                      {f.description}
                    </span>
                  </span>
                  {active ? (
                    <Check
                      size={18}
                      strokeWidth={2}
                      aria-hidden
                      className="flex-none text-[color:var(--color-brand-800)]"
                    />
                  ) : null}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => choose(null)}
              disabled={pending}
              aria-pressed={selected === null}
              className={`focus-ring flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-60 ${
                selected === null
                  ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.08]"
                  : "border-[color:var(--border-soft)] bg-[color:var(--surface-2)]"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9rem] font-bold text-[color:var(--text-primary)]">
                  Nenhum
                </span>
                <span className="block text-[0.75rem] text-[color:var(--text-muted)]">
                  Sem emblema de estilo.
                </span>
              </span>
              {selected === null ? (
                <Check
                  size={18}
                  strokeWidth={2}
                  aria-hidden
                  className="flex-none text-[color:var(--color-brand-800)]"
                />
              ) : null}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
