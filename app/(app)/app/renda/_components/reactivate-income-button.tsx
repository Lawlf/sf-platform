"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { queryKeys } from "../../_lib/query-keys";
import { reactivateIncomeAction } from "../_actions/reactivate-income.action";

export function ReactivateIncomeButton({ incomeId, label }: { incomeId: string; label?: string }) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const r = await reactivateIncomeAction(incomeId);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.incomes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
    });
  }

  const aria = label ? `Reativar ${label}` : "Reativar";

  return (
    <div className="flex flex-col items-end gap-1">
      <SimpleTooltip label="Reativar">
        <button
          type="button"
          disabled={pending}
          onClick={onClick}
          aria-label={aria}
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.14] hover:text-[color:var(--color-brand-800)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw size={15} strokeWidth={2} aria-hidden />
        </button>
      </SimpleTooltip>
      {error ? (
        <span role="alert" className="text-xs text-[color:var(--semantic-negative)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
