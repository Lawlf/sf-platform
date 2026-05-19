"use client";

import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import { archiveIncomeAction } from "../_actions/archive-income.action";

export function ArchiveIncomeButton({ incomeId }: { incomeId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const r = await archiveIncomeAction(incomeId);
      if (!r.ok) setError(r.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onClick}>
        {pending ? "Arquivando..." : "Arquivar"}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-[color:var(--color-negative)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
