"use client";

import { Pencil, Settings } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { ArchiveGoalButton } from "./archive-goal-button";
import { DeleteGoalButton } from "./delete-goal-button";

interface Props {
  goalId: string;
  goalTitle: string;
}

export function GoalSettingsSheet({ goalId, goalTitle }: Props) {
  return (
    <Sheet>
      <SimpleTooltip label="Configurações" side="bottom">
        <SheetTrigger
          aria-label={`Configurações: ${goalTitle}`}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-1)]"
        >
          <Settings size={18} strokeWidth={2} aria-hidden />
        </SheetTrigger>
      </SimpleTooltip>
      <SheetContent side="bottom" className="p-0">
        <SheetHeader className="p-4">
          <SheetTitle>{goalTitle}</SheetTitle>
        </SheetHeader>
        <div className="divide-y divide-[color:var(--border-soft)] border-t border-[color:var(--border-soft)]">
          <Link
            href={`/app/metas/${goalId}/editar` as Route}
            className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
              <Pencil size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
              Editar
            </span>
          </Link>
          <ArchiveGoalButton goalId={goalId} label={goalTitle} />
          <DeleteGoalButton goalId={goalId} label={goalTitle} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
