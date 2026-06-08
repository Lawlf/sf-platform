"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import { queryKeys } from "../../../_lib/query-keys";
import { reactivateDebtAction } from "../_actions/reactivate-debt.action";

export function ReactivateDebtButton({
  debtId,
  label,
  actionLabel = "Reativar dívida",
}: {
  debtId: string;
  label?: string;
  actionLabel?: string;
}) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const r = await reactivateDebtAction(debtId);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.debts("written_off") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
    });
  }

  const aria = label ? `${actionLabel}: ${label}` : actionLabel;

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={pending}
        onClick={onClick}
        aria-label={aria}
        className="w-full sm:w-auto"
      >
        <RotateCcw size={15} strokeWidth={2} className="mr-1.5" aria-hidden />
        {actionLabel}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-[color:var(--semantic-negative)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
