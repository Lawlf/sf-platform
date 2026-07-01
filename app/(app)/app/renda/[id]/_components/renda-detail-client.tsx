"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import type { IncomeFrequency } from "@/domain/entities/income.entity";

import type { SerializedIncomeMonth } from "../_actions/income-timeline.action";

import { RendaHeader } from "./renda-header";
import { RendaTimelineClient } from "./renda-timeline.client";

interface Props {
  incomeId: string;
  label: string;
  frequency: IncomeFrequency;
  isActive: boolean;
  isEstimated: boolean;
  startDate: Date;
  endDate: Date | null;
  progressPct: number | null;
  initialTotalReceivedCents: string;
  baseAmountCents: string;
  initialTimeline: SerializedIncomeMonth[];
  action?: ReactNode;
  children?: ReactNode;
}

function formatBRL(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RendaDetailClient({
  incomeId,
  label,
  frequency,
  isActive,
  isEstimated,
  startDate,
  endDate,
  progressPct,
  initialTotalReceivedCents,
  baseAmountCents,
  initialTimeline,
  action,
  children,
}: Props) {
  const [totalCents, setTotalCents] = useState(() => BigInt(initialTotalReceivedCents));

  return (
    <>
      <RendaHeader
        label={label}
        frequency={frequency}
        isActive={isActive}
        isEstimated={isEstimated}
        startDate={startDate}
        endDate={endDate}
        totalReceivedFormatted={formatBRL(totalCents)}
        progressPct={progressPct}
        action={action}
      />
      {children}
      <RendaTimelineClient
        incomeId={incomeId}
        initialTimeline={initialTimeline}
        baseAmountCents={baseAmountCents}
        onTotalDelta={(delta) => setTotalCents((t) => t + delta)}
      />
    </>
  );
}
