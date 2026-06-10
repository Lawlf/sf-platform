import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";
import { classifyExpense } from "@/domain/services/ofx/classify-expense";
import { classifyConsumo } from "@/domain/services/ofx/consumo-classifier";
import { isReserveTransfer } from "@/domain/services/ofx/reserve-transfer";
import {
  TransactionReportService,
  type AnnualReport,
} from "@/domain/services/transaction-report.service";

const EXCLUDED_CATEGORIES = new Set(["promoted_debt", "promoted_income", "internal_transfer"]);

export interface GetAnnualReportDeps {
  transactions: TransactionRepository;
}

export type GetAnnualReportResult =
  | { ok: true; report: AnnualReport; excludedMovements: number }
  | { ok: false; message: string };

export async function getAnnualReport(
  { transactions }: GetAnnualReportDeps,
  { userId, year, isPro }: { userId: string; year: number; isPro: boolean },
): Promise<GetAnnualReportResult> {
  if (!isPro) {
    return { ok: false, message: "O relatório anual é um recurso Pro." };
  }

  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  const allOut = (await transactions.listForUserInRange(userId, from, to)).filter(
    (t) => t.direction === "out" && t.deletedAt === null,
  );
  const spending = allOut.filter(
    (t) =>
      !(t.category != null && EXCLUDED_CATEGORIES.has(t.category)) &&
      !isReserveTransfer(t.description),
  );

  const report = TransactionReportService.annualReport(
    spending.map((t) => ({
      occurredAt: t.occurredAt,
      amountCents: t.amount.toCents(),
      consumo: classifyConsumo(t.description),
      category: classifyExpense(t.description),
    })),
    year,
  );

  return { ok: true, report, excludedMovements: allOut.length - spending.length };
}
