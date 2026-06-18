import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { classifyConsumo } from "@/domain/services/ofx/consumo-classifier";
import { isReserveTransfer } from "@/domain/services/ofx/reserve-transfer";

const EXCLUDED_CATEGORIES = new Set(["promoted_debt", "promoted_income", "internal_transfer"]);

export interface GetMonthlyConsumoDeps {
  transactions: Pick<TransactionRepositoryPort, "listForProfileInRange">;
}

export interface GetMonthlyConsumoInput {
  profileId: string;
  from: Date;
  to: Date;
}

export interface MonthlyConsumo {
  totalCents: bigint;
  essencialCents: bigint;
  parceladoCents: bigint;
  restoCents: bigint;
}

export async function getMonthlyConsumo(
  deps: GetMonthlyConsumoDeps,
  input: GetMonthlyConsumoInput,
): Promise<MonthlyConsumo> {
  const txns = await deps.transactions.listForProfileInRange(input.profileId, input.from, input.to);
  const consumo = txns.filter(
    (t) =>
      t.direction === "out" &&
      t.status === "paid" &&
      t.source === "ofx_import" &&
      t.deletedAt === null &&
      !(t.category != null && EXCLUDED_CATEGORIES.has(t.category)) &&
      !isReserveTransfer(t.description),
  );

  let essencialCents = 0n;
  let parceladoCents = 0n;
  let restoCents = 0n;
  for (const t of consumo) {
    const cents = t.amount.toCents();
    const cat = classifyConsumo(t.description);
    if (cat === "essencial") essencialCents += cents;
    else if (cat === "parcelado") parceladoCents += cents;
    else restoCents += cents;
  }

  return {
    totalCents: essencialCents + parceladoCents + restoCents,
    essencialCents,
    parceladoCents,
    restoCents,
  };
}
