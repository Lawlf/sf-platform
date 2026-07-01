"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Archive } from "lucide-react";
import { useState, useTransition } from "react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { queryKeys } from "../../_lib/query-keys";
import { archiveIncomeAction } from "../_actions/archive-income.action";

interface Props {
  incomeId: string;
  label?: string;
  trigger?: "icon" | "row";
}

export function ArchiveIncomeButton({ incomeId, label, trigger = "icon" }: Props) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const r = await archiveIncomeAction(incomeId);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.incomes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
      await queryClient.invalidateQueries({ queryKey: ["planning", "projection"] });
    });
  }

  const aria = label ? `Arquivar ${label}` : "Arquivar";

  if (trigger === "row") {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          disabled={pending}
          onClick={onClick}
          aria-label={aria}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
            <Archive size={18} strokeWidth={2} aria-hidden />
          </span>
          <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Arquivar
          </span>
        </button>
        {error ? (
          <span role="alert" className="px-4 pb-2 text-xs text-[color:var(--semantic-negative)]">
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <SimpleTooltip label="Arquivar">
        <button
          type="button"
          disabled={pending}
          onClick={onClick}
          aria-label={aria}
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--semantic-negative)]/[0.12] hover:text-[color:var(--semantic-negative)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Archive size={15} strokeWidth={2} aria-hidden />
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
