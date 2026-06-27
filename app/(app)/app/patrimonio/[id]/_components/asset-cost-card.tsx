import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";

export interface AssetCostView {
  noun: string;
  /** Tem dívida ligada: mostra a barra vale x devo. Sem dívida, só o valor. */
  hasDebt: boolean;
  valueFormatted: string;
  owedFormatted: string;
  ownFormatted: string;
  ownIsNegative: boolean;
  /** Fração devida do valor, 0-100. */
  owedPct: number;
  /** Parcela + gastos. null quando zero. */
  monthlyTotalFormatted: string | null;
  /** Só a parte da parcela. null quando zero. */
  monthlyInstallmentFormatted: string | null;
  /** Média mensal dos gastos das categorias ligadas. null quando zero. */
  monthlyExpensesFormatted: string | null;
}

export function AssetCostCard({ view }: { view: AssetCostView }) {
  const owedPct = Math.min(100, Math.max(0, view.owedPct));
  const ownPct = 100 - owedPct;
  const showBreakdown =
    view.monthlyInstallmentFormatted !== null && view.monthlyExpensesFormatted !== null;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
        O que esse {view.noun} representa
      </h2>

      {view.hasDebt ? (
        <>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
            {view.ownIsNegative ? (
              <div className="h-full w-full bg-[color:var(--semantic-negative)]/70" />
            ) : (
              <>
                <div
                  className="h-full bg-[color:var(--semantic-positive)]"
                  style={{ width: `${ownPct}%` }}
                />
                <div
                  className="h-full bg-[color:var(--semantic-negative)]/55"
                  style={{ width: `${owedPct}%` }}
                />
              </>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <CostStat label="Vale" value={view.valueFormatted} tone="primary" />
            <CostStat label="Você deve" value={view.owedFormatted} tone="negative" />
            <CostStat
              label="Seu de verdade"
              value={view.ownFormatted}
              tone={view.ownIsNegative ? "negative" : "positive"}
            />
          </div>

          {view.ownIsNegative ? (
            <p className="mt-3 text-[0.75rem] text-[color:var(--text-secondary)]">
              Hoje você deve mais do que esse {view.noun} vale.
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
            Vale
          </span>
          <span className="text-[1rem] font-extrabold text-[color:var(--text-primary)]">
            <HideableValue>{view.valueFormatted}</HideableValue>
          </span>
        </div>
      )}

      {view.monthlyTotalFormatted ? (
        <div className="mt-3 border-t border-[color:var(--border-soft)] pt-3">
          <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
            Sai cerca de{" "}
            <span className="font-bold text-[color:var(--text-primary)]">
              {view.monthlyTotalFormatted}
            </span>{" "}
            por mês.
          </p>
          {showBreakdown ? (
            <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
              {view.monthlyInstallmentFormatted} de parcela · {view.monthlyExpensesFormatted} em
              gastos (média de 3 meses).
            </p>
          ) : view.monthlyExpensesFormatted === null ? (
            <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
              Só a parcela entra aqui. Ligue uma categoria abaixo pra somar os gastos.
            </p>
          ) : (
            <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
              Média de 3 meses dos gastos que você ligou.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function CostStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "negative" | "positive";
}) {
  const color =
    tone === "negative"
      ? "text-[color:var(--semantic-negative)]"
      : tone === "positive"
        ? "text-[color:var(--semantic-positive)]"
        : "text-[color:var(--text-primary)]";
  return (
    <div>
      <div className="text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className={`mt-0.5 text-[0.8125rem] font-bold ${color}`}>
        <HideableValue>{value}</HideableValue>
      </div>
    </div>
  );
}
