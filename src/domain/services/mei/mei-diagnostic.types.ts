export interface MeiDiagnosticSnapshot {
  faturamentoMensalCents: bigint;
  despesasOperacionaisCents: bigint;
  dasCents: bigint;
  proLaboreCents: bigint;
  gastoPessoalPjCents: bigint;
  custoDeVidaMensalCents: bigint;
  saldoPfCents: bigint;
}

export type MeiInsightKind =
  | "pro_labore_curto"
  | "mistura_pf_pj"
  | "salario_real"
  | "caixa_preso";

export interface MeiInsight {
  kind: MeiInsightKind;
  impactCents: bigint;
  diffCents?: bigint;
  coberturaPct?: number;
  pctFaturamento?: number;
  proLaboreCents?: bigint;
  gastoPessoalPjCents?: bigint;
  valorCents?: bigint;
}

export interface MeiDiagnostic {
  empresaFaturouCents: bigint;
  voceRetirouCents: bigint;
  sobrouNaEmpresaCents: bigint;
  dinheiroRealCents: bigint;
  salarioRealCents: bigint;
  insights: MeiInsight[];
}
