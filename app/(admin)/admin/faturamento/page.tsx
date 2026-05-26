import { getAdminSummary, getRecentPayments } from "../_actions/metrics-queries";
import { KpiCard } from "../_components/kpi-card";
import { fmtBRL, fmtDate } from "../_lib/format";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  succeeded: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
};

export default async function FaturamentoPage() {
  const [summary, payments] = await Promise.all([getAdminSummary(), getRecentPayments(30)]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Faturamento</h1>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard label="MRR" value={fmtBRL(summary.mrrCents)} />
        <KpiCard label="Receita 30d" value={fmtBRL(summary.revenue30dCents)} />
        <KpiCard label="Receita total" value={fmtBRL(summary.revenueTotalCents)} />
      </div>

      <section className="glass-light overflow-x-auto rounded-2xl p-4">
        <p className="mb-3 text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          Pagamentos recentes
        </p>
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr className="text-left text-[color:var(--text-muted)]">
              <th scope="col" className="pb-2">Valor</th>
              <th scope="col" className="pb-2">Método</th>
              <th scope="col" className="pb-2">Status</th>
              <th scope="col" className="pb-2">Data</th>
              <th scope="col" className="pb-2">Fatura</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-[color:var(--border-soft)]">
                <td className="py-2 font-semibold text-[color:var(--text-primary)]">
                  {fmtBRL(p.amountCents)}
                </td>
                <td className="py-2 text-[color:var(--text-secondary)]">
                  {p.paymentMethod ?? "—"}
                </td>
                <td className="py-2 text-[color:var(--text-secondary)]">
                  {STATUS_LABEL[p.status] ?? p.status}
                </td>
                <td className="py-2 text-[color:var(--text-secondary)]">
                  {fmtDate(p.paidAt ?? p.createdAt)}
                </td>
                <td className="py-2">
                  {p.hostedInvoiceUrl ? (
                    <a
                      href={p.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring text-[color:var(--brand,#ef7a1a)] underline"
                    >
                      ver
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[color:var(--text-muted)]">
                  Nenhum pagamento ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
