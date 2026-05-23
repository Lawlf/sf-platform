"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { fetchUpcomingDues } from "../_actions/dashboard-queries";
import { queryKeys } from "../_lib/query-keys";

import { NextDueCard } from "./next-due-card";

const DAY_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function readDismissedKeys(): Set<string> {
  if (typeof document === "undefined") return new Set();
  const out = new Set<string>();
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    const name = eq === -1 ? trimmed : trimmed.slice(0, eq);
    if (name.startsWith("sf_due_dismissed_")) out.add(name);
  }
  return out;
}

export function NextDueSectionClient() {
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.upcomingDues,
    queryFn: () => fetchUpcomingDues(),
  });

  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setDismissed(readDismissedKeys());
  }, [data]);

  const visibleDue = data.find(
    (d) => !dismissed.has(`sf_due_dismissed_${d.debtId}_${d.dueDateIso}`),
  );

  if (!visibleDue) return null;

  const dueDate = new Date(visibleDue.dueDateIso);
  const now = new Date();
  const days = Math.max(0, Math.round((dueDate.getTime() - now.getTime()) / 86400000));

  return (
    <NextDueCard
      debtId={visibleDue.debtId}
      daysLabel={`${days}d`}
      title={visibleDue.label}
      amountFormatted={visibleDue.amount?.formatted ?? "Vencimento"}
      dueDateLabel={DAY_FMT.format(dueDate)}
      dueIso={visibleDue.dueDateIso}
      onDismissed={() => setDismissed(readDismissedKeys())}
    />
  );
}
