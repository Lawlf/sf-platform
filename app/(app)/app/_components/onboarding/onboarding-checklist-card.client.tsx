"use client";

import { Check, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import type { OnboardingChecklist } from "@/application/use-cases/onboarding/get-onboarding-state.use-case";

import { dismissChecklistItemAction } from "../../_actions/onboarding";

import { allChecklistDone, buildChecklistItems, type ChecklistItem } from "./checklist-items";

export function OnboardingChecklistCard({ checklist }: { checklist: OnboardingChecklist }) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed || allChecklistDone(checklist)) return null;

  const items = buildChecklistItems(checklist);
  const doneCount = items.filter((i) => i.done).length;
  const pending = items.filter((i) => !i.done);

  function dismissItem(key: "debt" | "goal") {
    startTransition(() => {
      void dismissChecklistItemAction(key);
    });
  }

  if (doneCount === 0) {
    return (
      <section
        aria-label="Complete seu perfil"
        className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold">Complete seu perfil</h2>
            <p className="text-xs opacity-70">
              Comece pela renda pra montar seu plano.
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
        <ChecklistItemList items={items} isPending={isPending} onDismiss={dismissItem} />
      </section>
    );
  }

  return (
    <section
      aria-label="Complete seu perfil"
      className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="focus-ring flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-semibold text-[color:var(--text-secondary)]">
            Perfil quase completo
          </p>
          <span
            aria-hidden
            className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]"
          >
            <span
              className="block h-full rounded-full bg-[color:var(--color-brand-500)]"
              style={{ width: `${(doneCount / items.length) * 100}%` }}
            />
          </span>
        </div>
        <ChevronRight
          size={18}
          strokeWidth={2.25}
          className={`shrink-0 text-[color:var(--text-muted)] transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="px-4 pb-4">
          <ChecklistItemList items={pending} isPending={isPending} onDismiss={dismissItem} />
        </div>
      ) : null}
    </section>
  );
}

function ChecklistItemList({
  items,
  isPending,
  onDismiss,
}: {
  items: ChecklistItem[];
  isPending: boolean;
  onDismiss: (key: "debt" | "goal") => void;
}) {
  return (
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
          <li key={item.key} className="flex items-center justify-between gap-2">
            <Link
              href={item.href}
              className="flex flex-1 items-center gap-2 text-sm font-medium hover:underline"
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--border-soft)]"
                aria-hidden
              />
              {item.label}
            </Link>
            {item.dismissible && (item.key === "debt" || item.key === "goal") ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => onDismiss(item.key as "debt" | "goal")}
                className="focus-ring rounded-md px-2 py-1 text-xs font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] disabled:opacity-50"
              >
                Não tenho
              </button>
            ) : null}
          </li>
        ),
      )}
    </ul>
  );
}
