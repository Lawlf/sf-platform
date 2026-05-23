import { ChevronRight, Lock } from "lucide-react";

import type { ModuleSpec } from "../_lib/trilhas";

export interface ModuleRowProps {
  module: ModuleSpec;
  isNext: boolean;
}

export function ModuleRow({ module, isNext }: ModuleRowProps) {
  const locked = !isNext && module.status !== "ready";
  return (
    <div
      className={`flex items-center gap-3 rounded-[12px] border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] p-3.5 backdrop-blur-sm ${
        locked ? "opacity-60" : ""
      }`}
    >
      <span
        className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full ${
          isNext
            ? "border-[1.5px] border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.12] text-[color:var(--color-brand-800)]"
            : "border-[1.5px] border-dashed border-[color:var(--border-soft)] text-[color:var(--text-muted)]"
        }`}
      >
        {isNext ? (
          <ChevronRight size={11} strokeWidth={2.5} aria-hidden />
        ) : (
          <Lock size={11} strokeWidth={2.2} aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[0.84375rem] font-semibold leading-[1.25] tracking-[-0.005em] text-[color:var(--text-primary)]">
          {String(module.num).padStart(2, "0")}. {module.title}
        </div>
        <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
          {module.subtitle} · {isNext ? "em construção" : "em breve"}
        </div>
      </div>
    </div>
  );
}
