"use client";

import { useTransition } from "react";

import type { ThemePreference } from "@/presentation/http/validators/theme.validators";

import { setThemeAction } from "../_actions/set-theme.action";

const OPTIONS: { value: ThemePreference; title: string; desc: string }[] = [
  { value: "light", title: "Claro", desc: "Fundo bege, contraste suave" },
  { value: "dark", title: "Escuro", desc: "Fundo charcoal, modo noturno" },
  { value: "system", title: "Sistema", desc: "Acompanha sua preferência do dispositivo" },
];

export function ThemeSwitcher({ current }: { current: ThemePreference }) {
  const [pending, startTransition] = useTransition();

  function onSelect(value: ThemePreference) {
    const fd = new FormData();
    fd.set("theme", value);
    startTransition(async () => {
      await setThemeAction(fd);
      const matches = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dark = value === "dark" || (value === "system" && matches);
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    });
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            aria-pressed={active}
            className={`glass-tier-3 focus-ring flex w-full items-center justify-between gap-3 p-4 text-left transition-colors ${
              active
                ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/10"
                : ""
            }`}
          >
            <div>
              <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                {opt.title}
              </div>
              <div className="text-xs text-[color:var(--text-secondary)]">{opt.desc}</div>
            </div>
            {active ? (
              <span className="text-xs font-semibold text-[color:var(--color-brand-700)]">
                Atual
              </span>
            ) : null}
          </button>
        );
      })}
      <p className="mt-1 text-xs text-[color:var(--text-muted)]">
        A mudança é instantânea e fica salva no seu dispositivo.
      </p>
    </div>
  );
}
