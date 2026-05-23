export interface SummaryItem {
  label: string;
  value: string;
}

export interface SummaryListProps {
  items: SummaryItem[];
}

export function SummaryList({ items }: SummaryListProps) {
  return (
    <section className="mb-[14px] rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-1.5 backdrop-blur-[16px]">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`flex items-baseline justify-between gap-3 py-2.5 text-[0.8125rem] ${
            i < items.length - 1 ? "border-b border-[color:var(--border-soft)]" : ""
          }`}
        >
          <span className="shrink-0 text-[color:var(--text-primary)] opacity-70">{item.label}</span>
          <span
            className="min-w-0 max-w-[65%] truncate text-right font-bold text-[color:var(--text-primary)]"
            title={item.value}
          >
            {item.value}
          </span>
        </div>
      ))}
    </section>
  );
}
