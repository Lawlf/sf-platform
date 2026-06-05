import { ChevronRight } from "lucide-react";

import { findInstrument } from "../_lib/instruments";
import type { InvestOption } from "../_lib/options";

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface OptionRowProps {
  option: InvestOption;
  finalCents?: bigint | null;
  isBest?: boolean;
  onOpen: () => void;
}

export function OptionRow({ option, finalCents, isBest, onOpen }: OptionRowProps) {
  const instrument = findInstrument(option.detailName);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`focus-ring flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
        isBest
          ? "border-[color:var(--semantic-positive)]/40 bg-[color:var(--semantic-positive)]/[0.06]"
          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-2)]"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          {option.name}
        </span>
        {finalCents == null && instrument ? (
          <span className="mt-0.5 block text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">
            {instrument.goodFor}
          </span>
        ) : null}
        {isBest ? (
          <span className="mt-1.5 inline-block rounded-full bg-[color:var(--semantic-positive)] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-white">
            Rende mais
          </span>
        ) : null}
      </span>

      {finalCents != null ? (
        <span
          className={`shrink-0 text-[1.0625rem] font-extrabold ${
            isBest ? "text-[color:var(--semantic-positive)]" : "text-[color:var(--text-primary)]"
          }`}
        >
          {brl(finalCents)}
        </span>
      ) : null}
      <ChevronRight
        size={18}
        strokeWidth={2.25}
        className="shrink-0 text-[color:var(--text-muted)]"
        aria-hidden
      />
    </button>
  );
}
