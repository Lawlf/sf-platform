import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { detectPatterns } from "@/domain/services/ofx/detect-patterns";
import { findInternalTransfers } from "@/domain/services/ofx/internal-transfers";
import { mergeOfxStatements } from "@/domain/services/ofx/merge-ofx-statements";
import type { OfxParseError, OfxSuggestions } from "@/domain/services/ofx/ofx-types";
import { parseOfx } from "@/domain/services/ofx/parse-ofx";
import { err, ok, type Result } from "@/shared/errors/result";

export interface BuildOfxPreviewDeps {
  assets: Pick<AssetRepositoryPort, "findByExternalAccountKey">;
  transactions: Pick<TransactionRepositoryPort, "existingExternalIds">;
}

export interface BuildOfxPreviewInput {
  userId: string;
  profileId: string;
  contents: string[];
}

export interface OfxReservePreview {
  guardouCents: bigint;
  tirouCents: bigint;
  existingValueCents: bigint | null;
}

export interface OfxPreview {
  accountKey: string;
  currency: string;
  ledgerBalanceCents: bigint;
  matchedAssetId: string | null;
  matchedAssetLabel: string | null;
  totalTransactionCount: number;
  newTransactionCount: number;
  duplicateCount: number;
  netCents: bigint;
  suggestions: OfxSuggestions;
  newFitIds: string[];
  reserve: OfxReservePreview | null;
}

export async function buildOfxPreview(
  deps: BuildOfxPreviewDeps,
  input: BuildOfxPreviewInput,
): Promise<Result<OfxPreview, OfxParseError>> {
  const statements = [];
  for (const c of input.contents) {
    const p = parseOfx(c);
    if (p._tag === "err") return err(p.error);
    statements.push(p.value);
  }
  const mergedR = mergeOfxStatements(statements);
  if (mergedR._tag === "err") return err(mergedR.error);
  const st = mergedR.value;

  const matched = await deps.assets.findByExternalAccountKey(input.profileId, st.accountKey);
  const allFitIds = st.transactions.map((t) => t.fitId).filter((id) => id.length > 0);
  const seen = new Set(await deps.transactions.existingExternalIds(input.userId, allFitIds));
  const newTxns = st.transactions.filter((t) => !seen.has(t.fitId));

  const movement = findInternalTransfers(newTxns);
  const reserveTxns = newTxns.filter((t) => movement.reserveFitIds.has(t.fitId));

  const netCents = newTxns
    .filter((t) => !movement.internalFitIds.has(t.fitId))
    .reduce((acc, t) => acc + (t.direction === "in" ? t.amountCents : -t.amountCents), 0n);

  const existingReserve = await deps.assets.findByExternalAccountKey(
    input.profileId,
    `${st.accountKey}:reserve`,
  );
  const existingReserveCents = existingReserve?.currentValue.toCents() ?? null;

  let reserve: OfxReservePreview | null = null;
  if (reserveTxns.length > 0 || existingReserveCents !== null) {
    const guardouCents = reserveTxns
      .filter((t) => t.direction === "out")
      .reduce((acc, t) => acc + t.amountCents, 0n);
    const tirouCents = reserveTxns
      .filter((t) => t.direction === "in")
      .reduce((acc, t) => acc + t.amountCents, 0n);
    reserve = {
      guardouCents,
      tirouCents,
      existingValueCents: existingReserveCents,
    };
  }

  return ok({
    accountKey: st.accountKey,
    currency: st.currency,
    ledgerBalanceCents: st.ledgerBalanceCents,
    matchedAssetId: matched?.id ?? null,
    matchedAssetLabel: matched?.label ?? null,
    totalTransactionCount: st.transactions.length,
    newTransactionCount: newTxns.length,
    duplicateCount: st.transactions.length - newTxns.length,
    netCents,
    suggestions: detectPatterns(newTxns, movement.internalFitIds),
    newFitIds: newTxns.map((t) => t.fitId),
    reserve,
  });
}
