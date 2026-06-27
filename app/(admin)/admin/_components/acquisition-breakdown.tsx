import type { AcquisitionBreakdown as Breakdown } from "@/domain/ports/repositories/admin-metrics.repository";

import { acquisitionLabel } from "../_lib/acquisition-labels";

function fmtPct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export function AcquisitionBreakdown({ data }: { data: Breakdown }) {
  const answered = data.byChannel.reduce((acc, r) => acc + r.count, 0);

  return (
    <section className="glass-light rounded-2xl p-4">
      <h2 className="mb-1 text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
        Como conheceram o Sabor
      </h2>
      <p className="mb-3 text-[0.75rem] text-[color:var(--text-muted)]">
        {answered} responderam, {data.unanswered} pularam ou ainda não passaram pelo onboarding.
        Auto-relato é sinal, não verdade: calculadora canibaliza Google e TikTok, e Google reúne
        quem descobriu em outro canal e depois pesquisou.
      </p>

      <table className="w-full border-collapse text-[0.8125rem]">
        <thead>
          <tr className="text-left text-[color:var(--text-muted)]">
            <th scope="col" className="pb-2">Canal</th>
            <th scope="col" className="pb-2">Pessoas</th>
            <th scope="col" className="pb-2">% das respostas</th>
          </tr>
        </thead>
        <tbody>
          {data.byChannel.map((r) => (
            <tr key={r.channel} className="border-t border-[color:var(--border-soft)] align-middle">
              <td className="py-2 font-medium text-[color:var(--text-primary)]">
                {acquisitionLabel(r.channel)}
              </td>
              <td className="py-2 text-[color:var(--text-secondary)]">{r.count}</td>
              <td className="py-2 text-[color:var(--text-secondary)]">{fmtPct(r.count, answered)}</td>
            </tr>
          ))}
          {data.byChannel.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-6 text-center text-[color:var(--text-muted)]">
                Ninguém respondeu ainda.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {data.otherDetails.length > 0 ? (
        <div className="mt-4">
          <h3 className="mb-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
            Respostas de &quot;Outro&quot;
          </h3>
          <ul className="flex flex-col gap-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
            {data.otherDetails.map((detail, i) => (
              <li key={i} className="border-t border-[color:var(--border-soft)] py-1">
                {detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
