"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Pencil, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";

import { fetchWalletBalance } from "../../_actions/wallet-queries";
import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import { queryKeys } from "../../_lib/query-keys";

import { WalletAnchorSheet } from "./wallet-anchor-sheet.client";

type SheetState = { open: boolean; mode: "capture" | "adjust" };

export function CarteiraBalanceRow() {
  const [sheet, setSheet] = useState<SheetState>({ open: false, mode: "capture" });

  const { data, isPending } = useQuery({
    queryKey: queryKeys.walletBalance,
    queryFn: () => fetchWalletBalance(),
  });

  if (isPending) {
    return (
      <div className="mt-4 border-t border-[color:var(--border-soft)] pt-3">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  const initialCents = (() => {
    try {
      return BigInt(data.reactiveBalance.cents);
    } catch {
      return 0n;
    }
  })();

  if (data.needsAnchor) {
    return (
      <div className="mt-4 border-t border-[color:var(--border-soft)] pt-3">
        <button
          type="button"
          onClick={() => setSheet({ open: true, mode: "capture" })}
          className="focus-ring flex w-full items-center gap-2 rounded-xl bg-[color:var(--color-brand-500)]/12 px-3 py-2.5 text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/20"
        >
          <Wallet size={16} strokeWidth={2} aria-hidden />
          Informar saldo da Carteira
        </button>
        <WalletAnchorSheet
          open={sheet.open}
          mode={sheet.mode}
          initialCents={initialCents}
          onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        />
      </div>
    );
  }

  const projectionCents = data.monthEndProjection.cents.trim();
  const projectionIsNegative = projectionCents.startsWith("-");
  const projectionSign = projectionIsNegative ? "−" : "+";
  const projectionColor = projectionIsNegative
    ? "var(--semantic-negative)"
    : "var(--semantic-positive)";
  const ProjectionIcon = projectionIsNegative ? TrendingDown : TrendingUp;
  const projectionFormatted = data.monthEndProjection.formatted.replace(/^[-−]\s*/, "");

  return (
    <div className="relative mt-4 flex items-center gap-3 border-t border-[color:var(--border-soft)] pt-3">
      <Link
        href={`/app/patrimonio/${data.walletId}` as Route}
        aria-label="Ver Carteira"
        className="absolute inset-0 z-[1]"
      />

      <div className="relative min-w-0 flex-1">
        <div className="truncate text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Saldo
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="truncate font-bold text-[color:var(--text-primary)]">
            <HideableValue>{data.reactiveBalance.formatted}</HideableValue>
          </span>
          <span
            className="inline-flex shrink-0 items-center gap-0.5 text-[0.6875rem] font-semibold"
            style={{ color: projectionColor }}
          >
            <ProjectionIcon size={11} strokeWidth={2.25} aria-hidden />
            <HideableValue>
              {projectionSign}
              {projectionFormatted}
            </HideableValue>
          </span>
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center">
        <button
          type="button"
          aria-label="Ajustar saldo da Carteira"
          onClick={() => setSheet({ open: true, mode: "adjust" })}
          className="focus-ring relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)]"
        >
          <Pencil size={14} strokeWidth={2} aria-hidden />
        </button>
        <ChevronRight
          size={15}
          strokeWidth={2}
          className="pointer-events-none shrink-0 text-[color:var(--text-muted)]"
          aria-hidden
        />
      </div>

      <WalletAnchorSheet
        open={sheet.open}
        mode={sheet.mode}
        initialCents={initialCents}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
      />
    </div>
  );
}
