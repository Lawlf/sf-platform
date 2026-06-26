import { fetchSafeToSpend } from "../_actions/safe-to-spend-queries";

function brl(cents: string): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function HomeSafeToSpendCard() {
  const data = await fetchSafeToSpend();
  if (!data) return null;

  const shell =
    "flex flex-col gap-1 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[18px] pb-[16px] pt-[14px]";

  if (data.state === "underwater") {
    return (
      <div className={shell}>
        <p className="text-sm text-[color:var(--text-soft)]">Quanto posso gastar</p>
        <p className="text-base font-medium">
          Esse mês seus compromissos já passam da renda garantida.
        </p>
        <p className="text-sm text-[color:var(--text-soft)]">
          Faltam {brl(data.shortfallCents)} pra cobrir o mês. Veja onde aliviar na sua prescrição.
        </p>
      </div>
    );
  }

  if (data.state === "tight-by-goal") {
    return (
      <div className={shell}>
        <p className="text-sm text-[color:var(--text-soft)]">Quanto posso gastar</p>
        <p className="text-base font-medium">
          Pra bater a meta no prazo, esse mês não sobra pra gasto livre.
        </p>
        <p className="text-sm text-[color:var(--text-soft)]">
          Estendendo o prazo da meta, sobram cerca de {brl(data.perWeekWithoutGoalCents)} por semana.
        </p>
      </div>
    );
  }

  return (
    <div className={shell}>
      <p className="text-sm text-[color:var(--text-soft)]">Quanto posso gastar</p>
      <p className="text-2xl font-semibold tabular-nums">
        {brl(data.perWeekCents)}
        <span className="ml-1 text-sm font-normal text-[color:var(--text-soft)]">por semana</span>
      </p>
      <p className="text-sm text-[color:var(--text-soft)]">
        {brl(data.poolCents)} livres no mês. Número de planejamento, não saldo em tempo real.
      </p>
    </div>
  );
}
