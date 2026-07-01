"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { togglePlanAction } from "../_actions/toggle-plan.action";

export function TogglePlanButton({
  planId,
  name,
  active,
}: {
  planId: string;
  name: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  const nextActive = !active;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const verb = nextActive ? "reativar" : "pausar";
        if (!window.confirm(`Confirma ${verb} o plano "${name}"?`)) return;
        start(async () => {
          const r = await togglePlanAction(planId, nextActive);
          if (r.ok) {
            toast.success(nextActive ? "Plano reativado." : "Plano pausado.", {
              description: name,
            });
          } else {
            toast.error("Falha ao atualizar plano.", {
              description: r.message ?? "Tenta de novo.",
            });
          }
        });
      }}
      className={`focus-ring rounded-lg border border-[color:var(--border-soft)] px-3 py-1.5 text-[0.75rem] font-semibold transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-60 ${
        active ? "text-[color:var(--text-secondary)]" : "text-[color:var(--color-brand-700)]"
      }`}
    >
      {active ? "Pausar" : "Reativar"}
    </button>
  );
}
