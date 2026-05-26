"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { ProGrant } from "@/application/use-cases/billing/grant-pro-manually.use-case";

import { grantProAction } from "../_actions/grant-pro.action";

interface Props {
  userId: string;
  email: string;
}

const PERIODS: { label: string; grant: ProGrant }[] = [
  { label: "1 mês", grant: { kind: "period", months: 1 } },
  { label: "3 meses", grant: { kind: "period", months: 3 } },
  { label: "12 meses", grant: { kind: "period", months: 12 } },
  { label: "Vitalício", grant: { kind: "lifetime" } },
];

export function GrantProDialog({ userId, email }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function grant(g: ProGrant) {
    if (g.kind === "lifetime") {
      if (!window.confirm("Conceder Pro VITALÍCIO para " + email + "? Isso envia email de boas-vindas.")) return;
    }
    start(async () => {
      const r = await grantProAction(userId, g);
      if (r.ok) {
        toast.success("Pro ativado.", { description: email });
        setOpen(false);
      } else {
        toast.error("Falha ao ativar Pro.", { description: r.message ?? "Tenta de novo." });
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring rounded-lg bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-3 py-1.5 text-[0.75rem] font-bold text-white"
      >
        Ativar Pro
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIODS.map((p) => (
        <button
          key={p.label}
          type="button"
          disabled={pending}
          onClick={() => grant(p.grant)}
          className="focus-ring rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-2.5 py-1.5 text-[0.75rem] font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)] disabled:opacity-60"
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="focus-ring px-2 py-1.5 text-[0.75rem] text-[color:var(--text-muted)]"
      >
        Cancelar
      </button>
    </div>
  );
}
