import type { MeiDiagnostic, MeiDiagnosticSnapshot, MeiInsight } from "./mei-diagnostic.types";

export function diagnoseMei(s: MeiDiagnosticSnapshot): MeiDiagnostic {
  const empresaFaturouCents = s.faturamentoMensalCents;
  const voceRetirouCents = s.proLaboreCents;
  const sobrouNaEmpresaCents =
    s.faturamentoMensalCents - s.despesasOperacionaisCents - s.dasCents - s.proLaboreCents;
  const dinheiroRealCents =
    s.saldoPfCents + (sobrouNaEmpresaCents > 0n ? sobrouNaEmpresaCents : 0n);
  const salarioRealCents = s.proLaboreCents + s.gastoPessoalPjCents;

  const insights: MeiInsight[] = [];

  if (s.custoDeVidaMensalCents > 0n && s.proLaboreCents < s.custoDeVidaMensalCents) {
    const diffCents = s.custoDeVidaMensalCents - s.proLaboreCents;
    const coberturaPct = Math.round(
      (Number(s.proLaboreCents) / Number(s.custoDeVidaMensalCents)) * 100,
    );
    insights.push({ kind: "pro_labore_curto", impactCents: diffCents, diffCents, coberturaPct });
  }

  if (s.gastoPessoalPjCents > 0n) {
    insights.push({
      kind: "mistura_pf_pj",
      impactCents: s.gastoPessoalPjCents,
      valorCents: s.gastoPessoalPjCents,
      ...(s.faturamentoMensalCents > 0n
        ? {
            pctFaturamento: Math.round(
              (Number(s.gastoPessoalPjCents) / Number(s.faturamentoMensalCents)) * 100,
            ),
          }
        : {}),
    });
  }

  if (salarioRealCents > 0n) {
    insights.push({
      kind: "salario_real",
      impactCents: salarioRealCents,
      proLaboreCents: s.proLaboreCents,
      gastoPessoalPjCents: s.gastoPessoalPjCents,
    });
  }

  if (sobrouNaEmpresaCents > 0n) {
    insights.push({
      kind: "caixa_preso",
      impactCents: sobrouNaEmpresaCents,
      valorCents: sobrouNaEmpresaCents,
    });
  }

  insights.sort((a, b) => {
    if (b.impactCents > a.impactCents) return 1;
    if (b.impactCents < a.impactCents) return -1;
    return 0;
  });

  return {
    empresaFaturouCents,
    voceRetirouCents,
    sobrouNaEmpresaCents,
    dinheiroRealCents,
    salarioRealCents,
    insights,
  };
}
