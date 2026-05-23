"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { fetchMonthDetail, type SerializedMonthDetail } from "../_actions/timeline-month-detail";

import { CommitmentCard } from "./commitment-card";

interface Props {
  monthIso: string;
  initialData: SerializedMonthDetail | null;
}

export function CommitmentSectionClient({ monthIso, initialData }: Props) {
  const { data: monthDetail } = useSuspenseQuery({
    queryKey: ["timeline", "monthDetail", monthIso],
    queryFn: () => fetchMonthDetail({ monthIso }),
    initialData,
  });

  if (!monthDetail) return null;

  const incomeCents = monthDetail.incomes.reduce((a, i) => a + BigInt(i.amount.cents), 0n);
  const outflowCents =
    monthDetail.expenses.reduce((a, e) => a + BigInt(e.amount.cents), 0n) +
    monthDetail.payments.reduce((a, p) => a + BigInt(p.amount.cents), 0n);

  const pct = incomeCents > 0n ? Number(outflowCents) / Number(incomeCents) : 0;

  return <CommitmentCard pct={pct} />;
}
