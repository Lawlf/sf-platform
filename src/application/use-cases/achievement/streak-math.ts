function monthToIndex(iso: string): number {
  const parts = iso.split("-");
  const y = Number.parseInt(parts[0] ?? "0", 10);
  const m = Number.parseInt(parts[1] ?? "1", 10);
  return y * 12 + (m - 1);
}

export function totalDistinctMonths(months: string[]): number {
  return new Set(months).size;
}

export function longestConsecutiveMonths(months: string[]): number {
  const idx = [...new Set(months)].map(monthToIndex).sort((a, b) => a - b);
  if (idx.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < idx.length; i++) {
    const cur = idx[i];
    const prev = idx[i - 1];
    if (cur === undefined || prev === undefined) continue;
    if (cur === prev + 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}
