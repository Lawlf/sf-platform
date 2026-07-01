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

import { ArchiveIncomeButton } from "./archive-income-button";
import { DeleteIncomeButton } from "./delete-income-button";
import { ReactivateIncomeButton } from "./reactivate-income-button";

interface Props {
  incomeId: string;
  label: string;
  isActive?: boolean;
}

const TRIGGER_CLASS =
  "focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)]";

export function IncomeOverflowMenu({ incomeId, label, isActive = true }: Props) {
  return (
    <Sheet>
      <SimpleTooltip label="Mais opções" side="bottom">
        <SheetTrigger aria-label={`Mais opções: ${label}`} className={TRIGGER_CLASS}>
          <Settings size={20} strokeWidth={2} aria-hidden />
        </SheetTrigger>
      </SimpleTooltip>
      <SheetContent side="bottom" className="p-0">
        <SheetHeader className="p-4">
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <div className="divide-y divide-[color:var(--border-soft)] border-t border-[color:var(--border-soft)]">
          <Link
            href={`/app/renda/${incomeId}/editar` as Route}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
              <Pencil size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
              Editar
            </span>
          </Link>
          {isActive ? (
            <ArchiveIncomeButton incomeId={incomeId} label={label} trigger="row" />
          ) : (
            <ReactivateIncomeButton incomeId={incomeId} label={label} trigger="row" />
          )}
          <DeleteIncomeButton incomeId={incomeId} label={label} trigger="row" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
