export function dateOnlyFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" });
}
