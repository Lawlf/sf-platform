import { type ReactNode } from "react";

import { formatCentsBRL } from "../../../_lib/format";
import { type SummaryItem } from "@/ui/summary-list";
import { type FinancingFormValues } from "../_schema";

interface OngoingDerived {
  currentBalanceCents: bigint;
  originalPrincipalCents: bigint;
}

interface SummaryInputs {
  values: FinancingFormValues;
  totalPaidValue: ReactNode;
  cetValue: ReactNode;
  linkSummary: string;
  ongoingDerived?: OngoingDerived | null;
}

export function buildFinancingSummary({
  values,
  totalPaidValue,
  cetValue,
  linkSummary,
  ongoingDerived,
}: SummaryInputs): SummaryItem[] {
  const hasRate = typeof values.annualRatePct === "number" && values.annualRatePct > 0;

  if (values.scenario === "new") {
    const rateRows: SummaryItem[] = hasRate
      ? [
          { label: "Taxa", value: `${values.annualRatePct}% a.a.` },
          { label: "CET (custo real)", value: cetValue },
        ]
      : [];
    return [
      { label: "Nome", value: values.label || "Sem nome" },
      { label: "Valor financiado", value: formatCentsBRL(values.principalCents) },
      ...rateRows,
      { label: "Prazo", value: `${values.termMonths} meses` },
      { label: "Total a pagar", value: totalPaidValue },
      { label: "Bem vinculado", value: linkSummary },
    ];
  }

  // Ongoing (flat): saldo/principal não vêm do form, são derivados da
  // parcela x contagens. Sem preview de amortização, então sem CET aqui.
  const currentBalanceCents = ongoingDerived?.currentBalanceCents ?? 0n;
  const originalPrincipalCents = ongoingDerived?.originalPrincipalCents ?? 0n;
  const rateRows: SummaryItem[] = hasRate
    ? [{ label: "Taxa", value: `${values.annualRatePct}% a.a.` }]
    : [];

  return [
    { label: "Nome", value: values.label || "Sem nome" },
    { label: "Quanto falta pagar", value: formatCentsBRL(currentBalanceCents) },
    ...(hasRate ? [{ label: "Total a pagar", value: totalPaidValue }] : []),
    ...rateRows,
    { label: "Parcelas restantes", value: `${values.remainingTerms}` },
    { label: "Valor financiado", value: formatCentsBRL(originalPrincipalCents) },
    { label: "Parcelas pagas", value: `${values.paidInstallments}` },
    { label: "Bem vinculado", value: linkSummary },
  ];
}

