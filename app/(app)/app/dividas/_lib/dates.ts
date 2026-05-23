// ISO yyyy-mm-dd para inputs <input type="date">.
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
