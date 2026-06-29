export function parsePercentInput(raw: string): number | null {
  if (raw === "") return 0;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPercentDisplay(value: number): string {
  return value === 0 ? "" : String(value);
}
