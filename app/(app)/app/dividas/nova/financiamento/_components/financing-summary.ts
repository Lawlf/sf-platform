import { type ReactNode } from "react";

import { formatCentsBRL } from "../../../_lib/format";
import { type SummaryItem } from "../../_components/summary-list";
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
  if (values.scenario === "new") {
    return [
      { label: "Nome", value: values.label || "Sem nome" },
      { label: "Tipo", value: "Financiamento" },
      { label: "Valor", value: formatCentsBRL(values.principalCents) },
      { label: "Taxa", value: `${values.annualRatePct}% a.a.` },
      { label: "CET (custo real)", value: cetValue },
      { label: "Prazo", value: `${values.termMonths} meses` },
      { label: "Total a pagar", value: totalPaidValue },
      { label: "Bem vinculado", value: linkSummary },
    ];
  }
  return [
    { label: "Nome", value: values.label || "Sem nome" },
    { label: "Tipo", value: "Financiamento" },
    { label: "Valor original", value: formatCentsBRL(values.originalPrincipalCents) },
    { label: "Quanto falta pagar", value: formatCentsBRL(values.currentBalanceCents) },
    { label: "Taxa", value: `${values.annualRatePct}% a.a.` },
    { label: "CET (custo real)", value: cetValue },
    { label: "Parcelas pagas", value: `${values.paidInstallments}` },
    { label: "Parcelas restantes", value: `${values.remainingTerms}` },
    { label: "Total a pagar", value: totalPaidValue },
    { label: "Bem vinculado", value: linkSummary },
  ];
}

