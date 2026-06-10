import type {
  DebtSuggestion,
  IncomeSuggestion,
  OfxSuggestions,
  OfxTxn,
} from "./ofx-types";
import { isReserveTransfer } from "./reserve-transfer";


function normalizeMemo(memo: string): string {
  return memo
    .toUpperCase()
    .replace(/\d+\/\d+/g, "")
    .replace(/[0-9]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function modeDay(dates: Date[]): number {
  const counts = new Map<number, number>();
  for (const d of dates) {
    const day = d.getUTCDate();
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  let best = dates[0]?.getUTCDate() ?? 1;
  let bestN = 0;
  for (const [day, n] of counts) {
    if (n > bestN) {
      best = day;
      bestN = n;
    }
  }
  return best;
}

function detectIncomes(credits: OfxTxn[]): IncomeSuggestion[] {
  const groups = new Map<string, OfxTxn[]>();
  for (const t of credits) {
    const key = `${normalizeMemo(t.memo)}|${t.amountCents}`;
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }
  const out: IncomeSuggestion[] = [];
  for (const arr of groups.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => a.postedAt.getTime() - b.postedAt.getTime());
    const first = arr[0];
    if (!first) continue;
    out.push({
      label: first.memo,
      amountCents: first.amountCents,
      dayOfMonth: modeDay(arr.map((t) => t.postedAt)),
      occurrences: arr.length,
      fitIds: arr.map((t) => t.fitId),
    });
  }
  return out;
}

function detectDebts(debits: OfxTxn[]): DebtSuggestion[] {
  const out: DebtSuggestion[] = [];
  for (const t of debits) {
    const m = t.memo.match(/(\d+)\s*\/\s*(\d+)/);
    if (!m) continue;
    const paid = m[1];
    const total = m[2];
    out.push({
      label: t.memo,
      installmentCents: t.amountCents,
      installmentsPaid: paid != null ? Number(paid) : null,
      installmentsTotal: total != null ? Number(total) : null,
      fitIds: [t.fitId],
    });
  }
  return out;
}

export function detectPatterns(txns: OfxTxn[], internalFitIds?: Set<string>): OfxSuggestions {
  const real = internalFitIds
    ? txns.filter((t) => !internalFitIds.has(t.fitId))
    : txns.filter((t) => !isReserveTransfer(t.memo));
  const credits = real.filter((t) => t.direction === "in");
  const debits = real.filter((t) => t.direction === "out");
  return { incomes: detectIncomes(credits), debts: detectDebts(debits) };
}
