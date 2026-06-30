import { type ReactNode } from "react";

import { formatCentsBRL } from "../../../_lib/format";
import { type SummaryItem } from "@/ui/summary-list";
import { type FinancingFormValues } from "../_schema";

interface SummaryInputs {
  values: FinancingFormValues;
  totalPaidValue: ReactNode;
  cetValue: ReactNode;
  linkSummary: string;
}

export function buildFinancingSummary({
  values,
  totalPaidValue,
  cetValue,
  linkSummary,
}: SummaryInputs): SummaryItem[] {
  const hasRate = typeof values.annualRatePct === "number" && values.annualRatePct > 0;
  const rateRows: SummaryItem[] = hasRate
    ? [
        { label: "Taxa", value: `${values.annualRatePct}% a.a.` },
        { label: "CET (custo real)", value: cetValue },
      ]
    : [];

  if (values.scenario === "new") {
    return [
      { label: "Nome", value: values.label || "Sem nome" },
      { label: "Valor financiado", value: formatCentsBRL(values.principalCents) },
      ...rateRows,
      { label: "Prazo", value: `${values.termMonths} meses` },
      { label: "Total a pagar", value: totalPaidValue },
      { label: "Bem vinculado", value: linkSummary },
    ];
  }
  return [
    { label: "Nome", value: values.label || "Sem nome" },
    { label: "Quanto falta pagar", value: formatCentsBRL(values.currentBalanceCents) },
    ...(hasRate ? [{ label: "Total a pagar", value: totalPaidValue }] : []),
    ...rateRows,
    { label: "Parcelas restantes", value: `${values.remainingTerms}` },
    { label: "Valor financiado", value: formatCentsBRL(values.originalPrincipalCents) },
    { label: "Parcelas pagas", value: `${values.paidInstallments}` },
    { label: "Bem vinculado", value: linkSummary },
  ];
}

