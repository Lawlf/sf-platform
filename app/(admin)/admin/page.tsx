import { getAdminSeries, getAdminSummary } from "./_actions/metrics-queries";
import { KpiCard } from "./_components/kpi-card";
import { Sparkline } from "./_components/sparkline";
import { fmtBRL, fmtPercent } from "./_lib/format";

export default async function AdminOverviewPage() {
  const [summary, series] = await Promise.all([getAdminSummary(), getAdminSeries(30)]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Visão geral</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard label="MRR" value={fmtBRL(summary.mrrCents)} />
        <KpiCard
          label="Assinantes"
          value={String(summary.proCount)}
          hint={`${summary.freeCount} no plano Free`}
        />
        <KpiCard label="Conversão" value={fmtPercent(summary.conversionRate)} />
        <KpiCard label="Receita 30d" value={fmtBRL(summary.revenue30dCents)} />
        <KpiCard label="Churn 30d" value={String(summary.churn30d)} />
        <KpiCard label="Falhas de pgto 30d" value={String(summary.failedPayments30d)} />
      </div>

      <section className="glass-light flex flex-col gap-3 rounded-2xl p-4">
        <p className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          Receita diária (30d)
        </p>
        <Sparkline values={series.revenue.map((p) => p.value)} label="Receita diária dos últimos 30 dias" />
      </section>

      <section className="glass-light flex flex-col gap-3 rounded-2xl p-4">
        <p className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          Novos cadastros (30d)
        </p>
        <Sparkline values={series.signups.map((p) => p.value)} label="Cadastros diários dos últimos 30 dias" />
      </section>
    </div>
  );
}
