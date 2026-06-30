export function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function todayIso(): string {
  return toLocalIsoDate(new Date());
}

export function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
