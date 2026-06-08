import { err, ok, type Result } from "@/shared/errors/result";

import type { OfxParseError, OfxStatement, OfxTxn } from "./ofx-types";

export function mergeOfxStatements(
  statements: OfxStatement[],
): Result<OfxStatement, OfxParseError> {
  if (statements.length === 0) return err({ kind: "empty" });

  const first = statements[0]!;
  if (statements.some((s) => s.accountKey !== first.accountKey)) {
    return err({ kind: "mixed_accounts" });
  }

  const byFitId = new Map<string, OfxTxn>();
  const noId: OfxTxn[] = [];
  for (const s of statements) {
    for (const t of s.transactions) {
      if (t.fitId.length === 0) {
        noId.push(t);
        continue;
      }
      if (!byFitId.has(t.fitId)) byFitId.set(t.fitId, t);
    }
  }

  const latest = statements.reduce((acc, s) => {
    const a = acc.asOf?.getTime() ?? -Infinity;
    const b = s.asOf?.getTime() ?? -Infinity;
    return b > a ? s : acc;
  });

  return ok({
    accountKey: first.accountKey,
    currency: first.currency,
    ledgerBalanceCents: latest.ledgerBalanceCents,
    asOf: latest.asOf,
    transactions: [...byFitId.values(), ...noId],
  });
}
