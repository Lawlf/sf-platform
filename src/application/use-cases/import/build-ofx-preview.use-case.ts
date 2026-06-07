import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";
import { detectPatterns } from "@/domain/services/ofx/detect-patterns";
import type { OfxParseError, OfxSuggestions } from "@/domain/services/ofx/ofx-types";
import { parseOfx } from "@/domain/services/ofx/parse-ofx";
import { err, ok, type Result } from "@/shared/errors/result";

export interface BuildOfxPreviewDeps {
  assets: Pick<AssetRepository, "findByExternalAccountKey">;
  transactions: Pick<TransactionRepository, "existingExternalIds">;
}

export interface BuildOfxPreviewInput {
  userId: string;
  content: string;
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
}

export async function buildOfxPreview(
  deps: BuildOfxPreviewDeps,
  input: BuildOfxPreviewInput,
): Promise<Result<OfxPreview, OfxParseError>> {
  const parsed = parseOfx(input.content);
  if (parsed._tag === "err") return err(parsed.error);
  const st = parsed.value;

  const matched = await deps.assets.findByExternalAccountKey(input.userId, st.accountKey);
  const allFitIds = st.transactions.map((t) => t.fitId).filter((id) => id.length > 0);
  const seen = new Set(await deps.transactions.existingExternalIds(input.userId, allFitIds));
  const newTxns = st.transactions.filter((t) => !seen.has(t.fitId));

  const netCents = newTxns.reduce(
    (acc, t) => acc + (t.direction === "in" ? t.amountCents : -t.amountCents),
    0n,
  );

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
    suggestions: detectPatterns(newTxns),
    newFitIds: newTxns.map((t) => t.fitId),
  });
}
