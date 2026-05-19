import type { FinancialSnapshotEntity } from "@/domain/entities/financial-snapshot.entity";

const PCT_FMT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function DashboardCards({ snapshot }: { snapshot: FinancialSnapshotEntity }) {
  return (
    <section className="-mx-2 flex snap-x gap-2 overflow-x-auto px-2 pb-2">
      <Card title="Renda mensal" value={snapshot.totalIncome.format()} />
      <Card
        title="Dívida total"
        value={snapshot.totalDebtBalance.format()}
        tone={snapshot.totalDebtBalance.isPositive() ? "negative" : "neutral"}
      />
      <Card
        title="% renda comprometida"
        value={
          Number.isFinite(snapshot.incomeCommittedPct)
            ? PCT_FMT.format(snapshot.incomeCommittedPct)
            : "sem dados"
        }
        tone={snapshot.incomeCommittedPct > 0.4 ? "negative" : "neutral"}
      />
      <Card title="CET médio (a.a.)" value={snapshot.cetWeightedAverage.toAnnual().format()} />
      <Card
        title="Saldo líquido mensal"
        value={snapshot.netWorth.format()}
        tone={snapshot.netWorth.isPositive() ? "positive" : "negative"}
      />
    </section>
  );
}

function Card({
  title,
  value,
  tone = "neutral",
}: {
  title: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const colorClass =
    tone === "positive"
      ? "text-[color:var(--color-positive)]"
      : tone === "negative"
        ? "text-[color:var(--color-negative)]"
        : "";
  return (
    <article className="glass-light flex min-w-[180px] snap-start flex-col gap-1 p-4">
      <p className="text-xs opacity-70">{title}</p>
      <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
    </article>
  );
}
