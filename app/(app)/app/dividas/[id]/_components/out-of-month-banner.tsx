import { CalendarOff } from "lucide-react";

export function OutOfMonthBanner() {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[color:var(--text-muted)]">
          <CalendarOff size={22} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)]">
            Fora do seu mês
          </h2>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Essa dívida não entra no seu comprometido, mas continua no total que você deve.
          </p>
        </div>
      </div>
    </section>
  );
}
