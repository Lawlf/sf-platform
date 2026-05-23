import { Activity, TrendingDown, TrendingUp } from "lucide-react";

/**
 * Preview único que reflete TODAS as preferências ao vivo: cores (vars
 * semânticas), tamanho do texto (rem segue o font-size raiz), densidade
 * (--spacing), contraste (tokens) e movimento (skeleton shimmer congela).
 * Valores ilustrativos e fixos. Fica sticky no topo da página.
 */
export function StickyPreview() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3.5 shadow-[var(--shadow-glass)] backdrop-blur-xl"
    >
      <div className="mb-2.5 text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-[color:var(--text-muted)]">
        Pré-visualização
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            <Activity size={12} strokeWidth={2} />
            Saúde
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--semantic-positive)]/15 px-2.5 py-1 text-[0.6875rem] font-bold text-[color:var(--semantic-positive)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--semantic-positive)]" />
            Saudável
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[0.8125rem] text-[color:var(--text-secondary)]">Patrimônio</span>
          <span className="inline-flex items-center gap-1 text-[0.9375rem] font-extrabold text-[color:var(--semantic-positive)]">
            <TrendingUp size={14} strokeWidth={2.25} />+ R$ 4.200
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[0.8125rem] text-[color:var(--text-secondary)]">Dívidas</span>
          <span className="inline-flex items-center gap-1 text-[0.9375rem] font-extrabold text-[color:var(--semantic-negative)]">
            <TrendingDown size={14} strokeWidth={2.25} />− R$ 1.150
          </span>
        </div>
        <p className="text-[0.75rem] leading-[1.5] text-[color:var(--text-muted)]">
          Seu saldo livre do mês cobre as contas com folga.
        </p>
        <div className="flex flex-col gap-1.5 pt-0.5">
          <span className="sf-skeleton relative h-2.5 w-2/3 overflow-hidden rounded-full" />
          <span className="sf-skeleton relative h-2.5 w-2/5 overflow-hidden rounded-full" />
        </div>
      </div>
    </div>
  );
}
