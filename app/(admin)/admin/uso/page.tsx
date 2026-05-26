import { getTopUsers, getUsageSummary } from "../_actions/usage-queries";
import { KpiCard } from "../_components/kpi-card";
import { fmtDate, fmtDuration } from "../_lib/format";

export default async function UsoPage() {
  const [summary, topUsers] = await Promise.all([getUsageSummary(), getTopUsers(10)]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Uso</h1>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="DAU" value={String(summary.dau)} hint="usuários ativos hoje" />
        <KpiCard label="WAU" value={String(summary.wau)} hint="usuários ativos (7d)" />
        <KpiCard label="MAU" value={String(summary.mau)} hint="usuários ativos (30d)" />
        <KpiCard
          label="Tempo médio/dia"
          value={fmtDuration(summary.avgDailyActiveSeconds30d)}
          hint="média por sessão-dia (30d)"
        />
      </section>

      <section className="glass-light overflow-x-auto rounded-2xl p-4">
        <h2 className="mb-3 text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
          Top usuários (30d)
        </h2>
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr className="text-left text-[color:var(--text-muted)]">
              <th scope="col" className="pb-2">Email</th>
              <th scope="col" className="pb-2">Tempo 30d</th>
              <th scope="col" className="pb-2">Última visita</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.map((u) => (
              <tr key={u.userId} className="border-t border-[color:var(--border-soft)] align-middle">
                <td className="py-2 font-medium text-[color:var(--text-primary)]">{u.email}</td>
                <td className="py-2 text-[color:var(--text-secondary)]">
                  {fmtDuration(u.activeSeconds30d)}
                </td>
                <td className="py-2 text-[color:var(--text-secondary)]">{fmtDate(u.lastSeenAt)}</td>
              </tr>
            ))}
            {topUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-[color:var(--text-muted)]">
                  Nenhum dado de uso registrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
