const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function UpcomingDues({
  items,
}: {
  items: { debtId: string; label: string; dueDate: string; amountFormatted: string | null }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm opacity-70">Sem vencimentos previstos.</p>;
  }
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {items.map((d) => (
        <li key={`${d.debtId}-${d.dueDate}`} className="flex items-center justify-between">
          <span>{d.label}</span>
          <span className="opacity-80">
            {DATE_FMT.format(new Date(d.dueDate))}
            {d.amountFormatted ? ` - ${d.amountFormatted}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
