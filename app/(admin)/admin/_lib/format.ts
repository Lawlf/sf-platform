const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** cents (bigint) -> "R$ 1.234,56" */
export function fmtBRL(cents: bigint): string {
  return brl.format(Number(cents) / 100);
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : date.format(dt);
}

export function fmtPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** seconds -> human-readable duration, e.g. "2h 34min" or "45min" or "—" */
export function fmtDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0 && m === 0) return "< 1min";
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
