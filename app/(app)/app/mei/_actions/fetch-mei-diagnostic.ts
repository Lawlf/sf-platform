"use server";

import { buildMeiDiagnostic } from "@/application/use-cases/mei/build-mei-diagnostic.use-case";
import { clock, repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";
import { formatCents } from "@/shared/format/money-format";

export type MeiInsightKind =
  | "pro_labore_curto"
  | "mistura_pf_pj"
  | "salario_real"
  | "caixa_preso";

export interface SerializedMeiInsight {
  kind: MeiInsightKind;
  diffCents?: string;
  coberturaPct?: number;
  pctFaturamento?: number;
  proLabore?: string;
  gastoPessoalPj?: string;
  valorCents?: string;
  salarioReal?: string;
}

export interface MeiDiagnosticPayload {
  hasPj: false;
}

export interface MeiDiagnosticData {
  hasPj: true;
  empresaFaturou: string;
  voceRetirou: string;
  sobrouNaEmpresa: string;
  dinheiroReal: string;
  salarioReal: string;
  insights: SerializedMeiInsight[];
  proLaboreCents: string;
  gastoPessoalPjCents: string;
  proLaboreFormatted: string;
  gastoPessoalPjFormatted: string;
  competencia: string;
}

export type MeiDiagnosticResult = MeiDiagnosticPayload | MeiDiagnosticData;

function firstDayOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function fetchMeiDiagnostic(): Promise<MeiDiagnosticResult> {
  const user = await requireUser();

  const pf = await repos.profiles.ensurePfProfile(user.id, clock.now());
  const allProfiles = await repos.profiles.listForUser(user.id);
  const pj = pf.linkedProfileId
    ? allProfiles.find((p) => p.id === pf.linkedProfileId) ?? null
    : allProfiles.find((p) => p.type === "PJ_MEI" && p.userId === user.id) ?? null;

  if (!pj) {
    return { hasPj: false };
  }

  const competencia = firstDayOfCurrentMonth();
  const competenciaStr = competencia.toISOString().slice(0, 10);

  const [diagnosticResult, meiEntry] = await Promise.all([
    buildMeiDiagnostic(
      {
        incomes: repos.incomes,
        debts: repos.debts,
        meiMonthly: repos.meiMonthly,
        assets: repos.assets,
        settlements: repos.recurringSettlements,
        incomeSettlements: repos.incomeSettlements,
        debtPayments: repos.debtPayments,
        transactions: repos.transactions,
        debtAmountAdjustments: repos.debtAmountAdjustments,
        clock,
      },
      { pfProfileId: pf.id, pjProfileId: pj.id, userId: user.id, competencia },
    ),
    repos.meiMonthly.findByProfileCompetencia(pj.id, competencia),
  ]);

  if (!isOk(diagnosticResult)) {
    return { hasPj: false };
  }

  const d = diagnosticResult.value;

  const serializedInsights: SerializedMeiInsight[] = d.insights.map((ins) => {
    const base: SerializedMeiInsight = { kind: ins.kind as MeiInsightKind };
    if (ins.diffCents !== undefined) base.diffCents = formatCents(ins.diffCents);
    if (ins.coberturaPct !== undefined) base.coberturaPct = ins.coberturaPct;
    if (ins.pctFaturamento !== undefined) base.pctFaturamento = ins.pctFaturamento;
    if (ins.proLaboreCents !== undefined) base.proLabore = formatCents(ins.proLaboreCents);
    if (ins.gastoPessoalPjCents !== undefined)
      base.gastoPessoalPj = formatCents(ins.gastoPessoalPjCents);
    if (ins.valorCents !== undefined) base.valorCents = formatCents(ins.valorCents);
    if (ins.kind === "salario_real") {
      base.salarioReal = formatCents(d.salarioRealCents);
    }
    return base;
  });

  const proLaboreCentsVal = meiEntry?.proLaboreCents ?? 0n;
  const gastoPessoalPjCentsVal = meiEntry?.gastoPessoalPjCents ?? 0n;

  return {
    hasPj: true,
    empresaFaturou: formatCents(d.empresaFaturouCents),
    voceRetirou: formatCents(d.voceRetirouCents),
    sobrouNaEmpresa: formatCents(d.sobrouNaEmpresaCents),
    dinheiroReal: formatCents(d.dinheiroRealCents),
    salarioReal: formatCents(d.salarioRealCents),
    insights: serializedInsights,
    proLaboreCents: String(proLaboreCentsVal),
    gastoPessoalPjCents: String(gastoPessoalPjCentsVal),
    proLaboreFormatted: formatCents(proLaboreCentsVal),
    gastoPessoalPjFormatted: formatCents(gastoPessoalPjCentsVal),
    competencia: competenciaStr,
  };
}
