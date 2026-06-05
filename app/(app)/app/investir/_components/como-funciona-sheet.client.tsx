"use client";

import { HelpCircle } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

import type { Instrument } from "../_lib/instruments";

const FIELDS: { key: keyof Omit<Instrument, "name" | "whatIs">; label: string }[] = [
  { key: "goodFor", label: "Pra que serve" },
  { key: "liquidity", label: "Quando dá pra sacar" },
  { key: "risk", label: "Risco" },
  { key: "tax", label: "Imposto" },
];

export function ComoFuncionaSheet({ instrument }: { instrument: Instrument }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="focus-ring inline-flex items-center gap-1 text-[0.75rem] font-medium text-[color:var(--color-brand-700)]"
        >
          <HelpCircle size={13} strokeWidth={2} aria-hidden />
          Como funciona
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col gap-3">
        <SheetHeader>
          <SheetTitle>{instrument.name}</SheetTitle>
          <SheetDescription>{instrument.whatIs}</SheetDescription>
        </SheetHeader>
        <dl className="flex flex-col gap-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-0.5">
              <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                {f.label}
              </dt>
              <dd className="text-[0.8125rem] leading-snug text-[color:var(--text-secondary)]">
                {instrument[f.key]}
              </dd>
            </div>
          ))}
        </dl>
      </SheetContent>
    </Sheet>
  );
}
