"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { OnboardingChecklist } from "@/application/use-cases/onboarding/get-onboarding-state.use-case";

import { allChecklistDone, buildChecklistItems } from "./checklist-items";

export function OnboardingChecklistCard({ checklist }: { checklist: OnboardingChecklist }) {
  const [dismissed, setDismissed] = useState(false);

  // Hide when everything is done (derivation) or dismissed for this session.
  if (dismissed || allChecklistDone(checklist)) return null;

  const items = buildChecklistItems(checklist);
  const doneCount = items.filter((i) => i.done).length;

  return (
    <section
      aria-label="Complete seu perfil"
      className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">Complete seu perfil</h2>
          <p className="text-xs opacity-70">
            {doneCount === 0
              ? `Faltam ${items.length} passos pro seu plano ficar completo.`
              : `${doneCount} de ${items.length} prontos. Quanto mais completo, melhor o seu plano.`}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dispensar"
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 opacity-60 hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) =>
          item.done ? (
            <li key={item.key} className="flex items-center gap-2 text-sm opacity-60">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-brand-500)] text-white">
                <Check size={13} />
              </span>
              <span className="line-through">{item.label}</span>
            </li>
          ) : (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex items-center gap-2 text-sm font-medium hover:underline"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--border-soft)]" aria-hidden />
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
