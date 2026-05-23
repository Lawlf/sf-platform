"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Archive } from "lucide-react";
import { useState, useTransition } from "react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { queryKeys } from "../../../_lib/query-keys";
import { archiveDebtAction } from "../_actions/archive-debt.action";

export function ArchiveDebtButton({ debtId, label }: { debtId: string; label?: string }) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const r = await archiveDebtAction(debtId, "paid_off");
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
    });
  }

  const aria = label ? `Arquivar ${label}` : "Marcar como quitada";

  return (
    <div className="flex flex-col items-end gap-1">
      <SimpleTooltip label="Marcar como quitada">
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
