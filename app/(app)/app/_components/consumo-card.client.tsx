"use client";

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ConsumoCardProps {
  total: number;
  essencial: number;
  parcelado: number;
  resto: number;
}

export function ConsumoCard({ total, essencial, parcelado, resto }: ConsumoCardProps) {
  if (total <= 0) return null;
  const pe = Math.round((essencial / total) * 100);
  const pp = Math.round((parcelado / total) * 100);
  const pr = Math.max(0, 100 - pe - pp);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          Consumo do mês
        </span>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Estimativa
        </span>
      </div>
      <div className="text-[1.25rem] font-bold text-[color:var(--text-primary)]">
        R$ {formatBrl(total)}
      </div>
      <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
        Saíram fora de dívida e reserva.
      </p>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]">
        <div className="h-full bg-[color:var(--color-brand-800)]" style={{ width: `${pe}%` }} />
        <div className="h-full bg-[color:var(--color-brand-500)]" style={{ width: `${pp}%` }} />
        <div className="h-full bg-[color:var(--color-brand-300)]" style={{ width: `${pr}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-[color:var(--text-secondary)]">
        <span>Essencial R$ {formatBrl(essencial)}</span>
        <span>Parcelado R$ {formatBrl(parcelado)}</span>
        <span>Dia a dia R$ {formatBrl(resto)}</span>
      </div>
      {resto >= essencial && resto >= parcelado ? (
        <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
          O Dia a dia junta Pix e compras avulsas que não dá pra rotular sozinho. A gente lê isso no
          agregado, no fim do mês.
        </p>
      ) : (
        <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
          Estimado pelo seu extrato. A gente agrupa por natureza, não item por item.
        </p>
      )}
    </section>
  );
}
