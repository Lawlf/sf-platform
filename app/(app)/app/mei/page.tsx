import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { PageShell } from "../_components/page-shell";
import { fetchMeiDiagnostic } from "./_actions/fetch-mei-diagnostic";
import { CreateMeiCta } from "./_components/create-mei-cta.client";
import { InsightsExpandable } from "./_components/insights-expandable.client";
import { MeiMonthlyForm } from "./_components/mei-monthly-form.client";

export const metadata: Metadata = { title: "Minha retirada" };

export default async function MeiPage() {
  const data = await fetchMeiDiagnostic();

  if (!data.hasPj) {
    return (
      <PageShell title="Minha retirada" description="Quanto você realmente ganha como MEI.">
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-6 py-8 text-center flex flex-col items-center gap-4">
          <Building2
            size={40}
            strokeWidth={1.5}
            aria-hidden
            className="text-[color:var(--text-muted)]"
          />
          <div className="flex flex-col gap-1">
            <p className="text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
              Você ainda não tem um perfil MEI
            </p>
            <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
              Conecte seu CNPJ para ver quanto você realmente ganha: pró-labore mais o que sai
              pela conta da empresa.
            </p>
          </div>
          <CreateMeiCta />
        </div>
      </PageShell>
    );
  }

  const {
    empresaFaturou,
    voceRetirou,
    sobrouNaEmpresa,
    dinheiroReal,
    salarioReal,
    insights,
    proLaboreCents,
    gastoPessoalPjCents,
    proLaboreFormatted,
    gastoPessoalPjFormatted,
    competencia,
  } = data;

  const monthLabel = new Date(`${competencia}T00:00:00Z`).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <PageShell title="Minha retirada" description={`Diagnóstico de ${monthLabel}`}>
      <section
        aria-label="Salário real do mês"
        className="rounded-2xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-6 py-6 text-white shadow-[0_8px_24px_rgba(239,122,26,0.35)] flex flex-col gap-2"
      >
        <p className="text-[0.75rem] font-semibold uppercase tracking-widest opacity-80">
          Seu salário real
        </p>
        <p className="text-4xl font-bold tabular-nums leading-none">{salarioReal}</p>
        <p className="text-[0.8125rem] opacity-90">
          Pró-labore {proLaboreFormatted} + gasto na empresa {gastoPessoalPjFormatted}
        </p>
      </section>

      <section aria-label="Números do mês">
        <dl className="grid grid-cols-2 gap-3">
          <MetricCard label="Empresa faturou" value={empresaFaturou} />
          <MetricCard label="Você retirou" value={voceRetirou} />
          <MetricCard label="Sobrou na empresa" value={sobrouNaEmpresa} />
          <MetricCard label="Seu dinheiro real" value={dinheiroReal} highlight />
        </dl>
      </section>

      {insights.length > 0 ? (
        <section aria-label="Análises">
          <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
            O que isso significa
          </h2>
          <InsightsExpandable insights={insights} />
        </section>
      ) : null}

      <section
        aria-label="Lançamento do mês"
        className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-5 py-5 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
            Lançar o mês
          </h2>
          <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
            Informe o que você retirou e o que pagou de conta pessoal pelo CNPJ.
          </p>
        </div>
        <MeiMonthlyForm
          competencia={competencia}
          initialProLaboreCents={BigInt(proLaboreCents)}
          initialGastoPessoalPjCents={BigInt(gastoPessoalPjCents)}
        />
      </section>
    </PageShell>
  );
}

function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 flex flex-col gap-0.5 ${
        highlight
          ? "border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.06]"
          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
      }`}
    >
      <dt className="text-[0.6875rem] font-medium text-[color:var(--text-muted)]">{label}</dt>
      <dd
        className={`text-[1.0625rem] font-bold tabular-nums ${
          highlight
            ? "text-[color:var(--color-brand-800)]"
            : "text-[color:var(--text-primary)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
