function normalizeMemoForId(memo: string): string {
  return memo.toUpperCase().replace(/\s+/g, " ").trim();
}

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export function syntheticId(t: {
  postedAt: Date;
  amountCents: bigint;
  direction: "in" | "out";
  memo: string;
}): string {
  const day = `${t.postedAt.getUTCFullYear()}${t.postedAt.getUTCMonth() + 1}${t.postedAt.getUTCDate()}`;
  const raw = `${day}|${t.amountCents}|${t.direction}|${normalizeMemoForId(t.memo)}`;
  return `syn:${djb2(raw)}`;
}
