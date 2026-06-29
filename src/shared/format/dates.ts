export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
