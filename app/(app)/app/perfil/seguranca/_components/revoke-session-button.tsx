"use client";

import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import { revokeSessionAction } from "../_actions/revoke-session.action";

export function RevokeSessionButton({ publicSessionId }: { publicSessionId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await revokeSessionAction(publicSessionId);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="destructive" disabled={pending} onClick={onClick}>
        {pending ? "Revogando..." : "Revogar"}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-[color:var(--color-negative)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
