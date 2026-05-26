"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { revokeProAction } from "../_actions/revoke-pro.action";

export function RevokeProButton({ userId, email }: { userId: string; email: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Revogar a cortesia Pro de " + email + "? O usuário volta para Free e recebe email.")) return;
        start(async () => {
          const r = await revokeProAction(userId);
          if (r.ok) toast.success("Pro revogado.", { description: email });
          else toast.error("Falha ao revogar.", { description: r.message ?? "Tenta de novo." });
        });
      }}
      className="focus-ring rounded-lg border border-[color:var(--border-soft)] px-3 py-1.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)] disabled:opacity-60"
    >
      Revogar cortesia
    </button>
  );
}
