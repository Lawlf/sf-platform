import { formatCentsBRL } from "../../../_lib/format";
import { type CashAssetForLoanPayload } from "../../_actions/list-cash-assets-for-loan.action";
import { type PersonalLoanFormValues } from "../_schema";

interface OngoingDerived {
  parcela: bigint;
  total: number;
  paid: number;
  remaining: number;
  currentBalanceCents: bigint;
  originalPrincipalCents: bigint;
  amountPaidCents: bigint;
}

interface SummaryInputs {
  values: PersonalLoanFormValues;
  iofCents: bigint | null;
  iofPercentText: string | null;
  cetAnnualText: string | null;
  cashAssets: CashAssetForLoanPayload[] | undefined;
  totalPaidValue: string;
  linkSummary: string;
  ongoingDerived: OngoingDerived | null;
}

export function buildLoanSummary({
  values,
  iofCents,
  iofPercentText,
  cetAnnualText,
  cashAssets,
  totalPaidValue,
  linkSummary,
  ongoingDerived,
}: SummaryInputs): { label: string; value: string }[] {
  const hasRate = typeof values.annualRatePct === "number" && values.annualRatePct > 0;

  if (values.scenario === "new") {
    const cashSummary = buildCashSummaryNew(values, cashAssets);
    return [
      { label: "Nome", value: values.label || "Sem nome" },
      { label: "Valor recebido", value: formatCentsBRL(values.netReceivedCents) },
      { label: "Valor contratado", value: formatCentsBRL(values.principalCents) },
      ...(iofCents && iofPercentText
        ? [{ label: "IOF + tarifas", value: `${formatCentsBRL(iofCents)} (${iofPercentText}%)` }]
        : []),
      ...(hasRate
        ? [
            { label: "Taxa", value: `${values.annualRatePct}% a.a.` },
            { label: "CET (custo real)", value: cetAnnualText ?? `${values.annualRatePct}% a.a.` },
          ]
        : []),
      { label: "Prazo", value: `${values.termMonths} meses` },
      { label: "Total a pagar", value: totalPaidValue },
      { label: "Bem vinculado", value: linkSummary },
      { label: "Dinheiro recebido", value: cashSummary },
    ];
  }
  const d = ongoingDerived;
  return [
    { label: "Nome", value: values.label || "Sem nome" },
    { label: "Quanto falta pagar", value: d ? formatCentsBRL(d.currentBalanceCents) : totalPaidValue },
    { label: "Parcela", value: formatCentsBRL(values.monthlyInstallmentCents) },
    { label: "Parcelas restantes", value: `${d?.remaining ?? 0}` },
    { label: "Parcelas pagas", value: `${d?.paid ?? 0}` },
    ...(hasRate ? [{ label: "Taxa", value: `${values.annualRatePct}% a.a.` }] : []),
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

