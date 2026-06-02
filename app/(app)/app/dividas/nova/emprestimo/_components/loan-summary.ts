import { formatCentsBRL } from "../../../_lib/format";
import { type CashAssetForLoanPayload } from "../../_actions/list-cash-assets-for-loan.action";
import { type PersonalLoanFormValues } from "../_schema";

interface SummaryInputs {
  values: PersonalLoanFormValues;
  iofCents: bigint | null;
  iofPercentText: string | null;
  cetAnnualText: string | null;
  cashAssets: CashAssetForLoanPayload[] | undefined;
  totalPaidValue: string;
  linkSummary: string;
}

export function buildLoanSummary({
  values,
  iofCents,
  iofPercentText,
  cetAnnualText,
  cashAssets,
  totalPaidValue,
  linkSummary,
}: SummaryInputs): { label: string; value: string }[] {
  if (values.scenario === "new") {
    const cashSummary = buildCashSummaryNew(values, cashAssets);
    return [
      { label: "Rótulo", value: values.label || "Sem rótulo" },
      { label: "Tipo", value: "Empréstimo ou crediário" },
      { label: "Valor recebido", value: formatCentsBRL(values.netReceivedCents) },
      { label: "Valor contratado", value: formatCentsBRL(values.principalCents) },
      {
        label: "IOF + tarifas",
        value:
          iofCents && iofPercentText ? `${formatCentsBRL(iofCents)} (${iofPercentText}%)` : "R$ 0,00",
      },
      { label: "Taxa", value: `${values.annualRatePct}% a.a.` },
      { label: "CET (custo real)", value: cetAnnualText ?? `${values.annualRatePct}% a.a.` },
      { label: "Prazo", value: `${values.termMonths} meses` },
      { label: "Total a pagar", value: totalPaidValue },
      { label: "Bem vinculado", value: linkSummary },
      { label: "Dinheiro recebido", value: cashSummary },
    ];
  }
  return [
    { label: "Rótulo", value: values.label || "Sem rótulo" },
    { label: "Tipo", value: "Empréstimo ou crediário" },
    { label: "Valor original contratado", value: formatCentsBRL(values.originalPrincipalCents) },
    { label: "Saldo devedor atual", value: formatCentsBRL(values.currentBalanceCents) },
    { label: "Parcela", value: formatCentsBRL(values.monthlyInstallmentCents) },
    { label: "Parcelas pagas", value: `${values.paidInstallments}` },
    { label: "Parcelas restantes", value: `${values.remainingTerms}` },
    { label: "Taxa", value: `${values.annualRatePct}% a.a.` },
    { label: "Total a pagar restante", value: totalPaidValue },
    { label: "Bem vinculado", value: linkSummary },
  ];
}

function buildCashSummaryNew(
  values: Extract<PersonalLoanFormValues, { scenario: "new" }>,
  cashAssets: CashAssetForLoanPayload[] | undefined,
): string {
  const target = values.cashTarget ?? null;
  const principal = values.principalCents;
  if (target === "existing") {
    const found = (cashAssets ?? []).find((a) => a.id === values.existingCashAssetId);
    const accountName = found?.label ?? "conta selecionada";
    return `Vai entrar ${formatCentsBRL(principal)} em ${accountName}.`;
  }
  if (target === "new") {
    const name = (values.newCashAssetName ?? "").trim() || "nova conta";
    const balanceBefore = values.newCashAssetCurrentBalanceCents ?? 0n;
    const totalBalance = balanceBefore + principal;
    return `Vamos criar "${name}" com saldo ${formatCentsBRL(totalBalance)} (${formatCentsBRL(balanceBefore)} antes + ${formatCentsBRL(principal)} recebido).`;
  }
  return "Sem mexer no saldo de nenhuma conta.";
}

