"use client";

import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import { archiveDebtAction } from "../_actions/archive-debt.action";

export function ArchiveDebtButton({ debtId }: { debtId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick(reason: "paid_off" | "written_off") {
    setError(null);
    startTransition(async () => {
      const r = await archiveDebtAction(debtId, reason);
      if (!r.ok) setError(r.message);
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => onClick("paid_off")}
      >
        {pending ? "Salvando..." : "Marcar como quitada"}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-[color:var(--color-negative)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
