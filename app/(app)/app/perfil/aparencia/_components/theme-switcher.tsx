"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTransition } from "react";

import type { ThemePreference } from "@/presentation/http/validators/theme.validators";

import { setThemeAction } from "../_actions/set-theme.action";

type Option = {
  value: ThemePreference;
  title: string;
  icon: typeof Sun;
  /** Tom de fundo que a opção representa (amostra fixa, independe do tema ativo). */
  swatch: string;
};

const OPTIONS: Option[] = [
  { value: "light", title: "Claro", icon: Sun, swatch: "#fdf8f3" },
  { value: "dark", title: "Escuro", icon: Moon, swatch: "#1f1d1c" },
  {
    value: "system",
    title: "Sistema",
    icon: Monitor,
    swatch: "linear-gradient(135deg, #fdf8f3 0 50%, #1f1d1c 50% 100%)",
  },
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
    <div className="grid grid-cols-3 gap-3" aria-busy={pending}>
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            aria-pressed={active}
            className={`focus-ring flex flex-col items-center gap-2 rounded-2xl border p-2 transition-colors ${
              active
                ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/10"
                : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
            }`}
          >
            <span
              aria-hidden
              className="relative flex h-16 w-full items-end justify-start overflow-hidden rounded-xl border border-[color:var(--border-soft)] p-2"
              style={{ background: opt.swatch }}
            >
              <span className="h-1.5 w-8 rounded-full bg-[color:var(--color-brand-500)]" />
            </span>
            <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
              <Icon size={14} strokeWidth={2} aria-hidden />
              {opt.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
