import type { TransactionRepository } from "@/domain/ports/repositories/transaction.repository";
import {
  TransactionReportService,
  type AnnualReport,
} from "@/domain/services/transaction-report.service";

export interface GetAnnualReportDeps {
  transactions: TransactionRepository;
}

export type GetAnnualReportResult =
  | { ok: true; report: AnnualReport }
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
  const txns = (await transactions.listForUserInRange(userId, from, to)).filter(
    (t) => t.direction === "out",
  );

  const report = TransactionReportService.annualReport(
    txns.map((t) => ({
      occurredAt: t.occurredAt,
      amountCents: t.amount.toCents(),
      category: t.category,
    })),
    year,
  );

  return { ok: true, report };
}
