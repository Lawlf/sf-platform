"use client";

import { useQuery } from "@tanstack/react-query";
import { Pencil, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";

import { fetchWalletBalance } from "../../_actions/wallet-queries";
import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import { queryKeys } from "../../_lib/query-keys";

import { WalletAnchorSheet } from "./wallet-anchor-sheet.client";

type SheetState = { open: boolean; mode: "capture" | "adjust" };

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="relative overflow-hidden bg-[color:var(--surface-1)] p-[22px]"
      style={{
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-glass-strong)",
        border: "1px solid color-mix(in srgb, var(--color-brand-500) 16%, transparent)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full"
        style={{ background: "color-mix(in srgb, var(--color-brand-500) 10%, transparent)" }}
      />
      {children}
    </section>
  );
}

function CardHeading() {
  return (
    <div className="flex items-center gap-1.5 text-[color:var(--color-brand-800)]">
      <Wallet size={15} strokeWidth={2} aria-hidden />
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px]">Sua Carteira</span>
    </div>
  );
}

// asDetail = já está na tela de detalhe da Carteira (não vira link pra si mesma).
export function CarteiraBalanceCard({ asDetail = false }: { asDetail?: boolean } = {}) {
  const [sheet, setSheet] = useState<SheetState>({ open: false, mode: "capture" });

  const { data, isPending } = useQuery({
    queryKey: queryKeys.walletBalance,
    queryFn: () => fetchWalletBalance(),
  });

  if (isPending) {
    return (
      <CardShell>
        <div className="relative flex flex-col gap-4">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
      </CardShell>
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

  // Link pra tela da Carteira (some quando já estamos nela). Stretched link:
  // cobre o card; os botões ficam acima (z-10) pra abrir o sheet sem navegar.
  const detailHref: Route | null = asDetail ? null : (`/app/patrimonio/${data.walletId}` as Route);
  const cardLink = detailHref ? (
    <Link href={detailHref} aria-label="Ver Carteira" className="absolute inset-0 z-[1]" />
  ) : null;

  if (data.needsAnchor) {
    return (
      <>
        <CardShell>
          {cardLink}
          <div className="relative flex flex-col gap-3">
            <CardHeading />
            <p className="text-[0.9375rem] font-semibold leading-snug text-[color:var(--text-primary)]">
              Pra acompanhar seu saldo da Carteira de verdade, diz quanto você tem na conta hoje.
            </p>
            <Button
              variant="brand"
              size="sm"
              className="relative z-10 self-start"
              onClick={() => setSheet({ open: true, mode: "capture" })}
            >
              <Wallet size={16} strokeWidth={2} aria-hidden />
              Informar saldo
            </Button>
          </div>
        </CardShell>
        <WalletAnchorSheet
          open={sheet.open}
          mode={sheet.mode}
          initialCents={initialCents}
          onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        />
      </>
    );
  }

  const projectionCents = data.monthEndProjection.cents.trim();
  const isNegative = projectionCents.startsWith("-");
  const sign = isNegative ? "−" : "+";
  const projectionColor = isNegative ? "var(--semantic-negative)" : "var(--semantic-positive)";
  const ProjectionIcon = isNegative ? TrendingDown : TrendingUp;
  const projectionFormatted = data.monthEndProjection.formatted.replace(/^[-−]\s*/, "");

  return (
    <>
      <CardShell>
        {cardLink}
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <CardHeading />
            <Button
              variant="ghost"
              size="sm"
              className="relative z-10 -mr-1.5 -mt-1.5 h-8 gap-1.5 px-2.5 text-[0.8125rem] text-[color:var(--text-secondary)]"
              onClick={() => setSheet({ open: true, mode: "adjust" })}
            >
              <Pencil size={14} strokeWidth={2} aria-hidden />
              Ajustar saldo
            </Button>
          </div>

          <div
            className="flex flex-col gap-1"
            style={{ animation: "sf-reveal-up 600ms cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
              Saldo da Carteira
            </span>
            <span className="text-3xl font-bold tabular-nums leading-none text-[color:var(--text-primary)]">
              <HideableValue>{data.reactiveBalance.formatted}</HideableValue>
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 text-[0.8125rem] font-medium leading-snug"
            style={{
              color: projectionColor,
              animation: "sf-reveal-up 600ms cubic-bezier(0.22,1,0.36,1) 140ms both",
            }}
          >
            <ProjectionIcon size={16} strokeWidth={2} aria-hidden className="shrink-0" />
            <span>
              No ritmo atual, você fecha o mês em {sign}
              <HideableValue>{projectionFormatted}</HideableValue>
            </span>
          </div>
        </div>
      </CardShell>

      <WalletAnchorSheet
        open={sheet.open}
        mode={sheet.mode}
        initialCents={initialCents}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
      />
    </>
  );
}
