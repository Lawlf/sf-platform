function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Rótulo de agrupamento por data, estilo feed (Instagram/Twitter):
 * Hoje, Ontem, dia da semana (mesma semana), Semana passada, e datas
 * antigas com dia/mês/ano. Como a lista vem ordenada desc por data, os
 * rótulos aparecem em ordem cronológica naturalmente.
 */
export function notificationDateLabel(date: Date, now: Date): string {
  const dayMs = 86_400_000;
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / dayMs);
  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) {
    const wd = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
    return wd.charAt(0).toUpperCase() + wd.slice(1);
  }
  if (diffDays < 14) return "Semana passada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
