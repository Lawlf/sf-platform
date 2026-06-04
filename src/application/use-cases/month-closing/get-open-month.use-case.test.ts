import { describe, expect, it } from "vitest";

import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { MonthClosingRepository } from "@/domain/ports/repositories/month-closing.repository";
import { MonthYear } from "@/domain/value-objects/month-year.vo";

import { getOpenMonth } from "./get-open-month.use-case";

const clock: Clock = { now: () => new Date("2026-06-15T00:00:00Z") };

function makeClosing(monthIso: string): MonthClosingEntity {
  return {
    userId: "u1",
    month: MonthYear.fromIso(monthIso).firstDay(),
    baselineNetWorthCents: 0n,
    endNetWorthCents: 0n,
    theoreticalFreeCashFlowCents: 0n,
    leakCents: 0n,
    closedAt: new Date("2026-06-01T00:00:00Z"),
  };
}

function closingsRepo(stored: MonthClosingEntity[]): MonthClosingRepository {
  return {
    upsert: async () => {},
    listForUser: async () => stored,
    latest: async () => {
      if (stored.length === 0) return null;
      return [...stored].sort((a, b) => b.month.getTime() - a.month.getTime())[0]!;
    },
  };
}

describe("getOpenMonth", () => {
  it("returns the previous ended month when there are no closings", async () => {
    const r = await getOpenMonth({ closings: closingsRepo([]), clock }, { userId: "u1" });
    expect(r).toEqual({ openMonthIso: "2026-05" });
  });

  it("returns null when the last closed month is the most recent ended month", async () => {
    const r = await getOpenMonth(
      { closings: closingsRepo([makeClosing("2026-05")]), clock },
      { userId: "u1" },
    );
    expect(r).toBeNull();
  });

  it("returns the next unclosed month for catch-up", async () => {
    const r = await getOpenMonth(
      { closings: closingsRepo([makeClosing("2026-03")]), clock },
      { userId: "u1" },
    );
    expect(r).toEqual({ openMonthIso: "2026-04" });
  });
});
