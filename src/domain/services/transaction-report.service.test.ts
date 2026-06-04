import { describe, expect, it } from "vitest";

import { TransactionReportService } from "./transaction-report.service";

function tx(iso: string, cents: bigint, category: string | null) {
  return { occurredAt: new Date(iso), amountCents: cents, category };
}

describe("TransactionReportService.annualReport", () => {
  it("totals by month and by category for the given year", () => {
    const report = TransactionReportService.annualReport(
      [
        tx("2026-01-10T00:00:00Z", 4000n, "alimentação"),
        tx("2026-01-20T00:00:00Z", 6000n, "alimentação"),
        tx("2026-03-05T00:00:00Z", 5000n, "transporte"),
        tx("2026-03-15T00:00:00Z", 1000n, null),
      ],
      2026,
    );

    expect(report.year).toBe(2026);
    expect(report.totalCents).toBe(16000n);
    expect(report.byMonth).toHaveLength(12);
    expect(report.byMonth[0]).toEqual({ month: 1, totalCents: 10000n });
    expect(report.byMonth[2]).toEqual({ month: 3, totalCents: 6000n });
    expect(report.byMonth[1]).toEqual({ month: 2, totalCents: 0n });
  });

  it("sorts categories by total descending and keeps a null category", () => {
    const report = TransactionReportService.annualReport(
      [
        tx("2026-02-01T00:00:00Z", 1000n, "lazer"),
        tx("2026-02-02T00:00:00Z", 9000n, "alimentação"),
        tx("2026-02-03T00:00:00Z", 3000n, null),
      ],
      2026,
    );

    expect(report.byCategory.map((c) => c.category)).toEqual(["alimentação", null, "lazer"]);
    expect(report.byCategory[0]).toEqual({ category: "alimentação", totalCents: 9000n });
  });

  it("ignores transactions outside the year", () => {
    const report = TransactionReportService.annualReport(
      [
        tx("2025-12-31T00:00:00Z", 5000n, "alimentação"),
        tx("2026-06-15T00:00:00Z", 2000n, "alimentação"),
        tx("2027-01-01T00:00:00Z", 9000n, "alimentação"),
      ],
      2026,
    );

    expect(report.totalCents).toBe(2000n);
    expect(report.byMonth[5]).toEqual({ month: 6, totalCents: 2000n });
  });

  it("returns an empty-but-shaped report when there are no transactions", () => {
    const report = TransactionReportService.annualReport([], 2026);
    expect(report.totalCents).toBe(0n);
    expect(report.byMonth).toHaveLength(12);
    expect(report.byCategory).toEqual([]);
  });
});
