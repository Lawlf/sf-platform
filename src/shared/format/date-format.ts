export function formatDateSafe(
  fmt: Intl.DateTimeFormat,
  date: Date | null | undefined,
): string | null {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return fmt.format(date);
}
