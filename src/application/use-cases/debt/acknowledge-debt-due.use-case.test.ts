import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { acknowledgeDebtDue } from "./acknowledge-debt-due.use-case";

const clock = { now: () => new Date(2026, 5, 15) };

describe("acknowledgeDebtDue", () => {
  it("grava ack paid do ciclo", async () => {
    const saved: any[] = [];
    const deps = {
      debts: { findById: async () => ({ id: "c1", profileId: "p1", userId: "u1" }) },
      acknowledgements: { upsert: async (e: any) => { saved.push(e); } },
      clock,
    } as any;
    const r = await acknowledgeDebtDue(deps, { profileId: "p1", userId: "u1", debtId: "c1", cycleIso: "2026-06", response: "paid" });
    expect(isOk(r)).toBe(true);
    expect(saved[0].response).toBe("paid");
    expect(saved[0].cycleIso).toBe("2026-06");
  });

  it("nega acesso de outro profile", async () => {
    const deps = {
      debts: { findById: async () => ({ id: "c1", profileId: "outro", userId: "u1" }) },
      acknowledgements: { upsert: async () => {} },
      clock,
    } as any;
    const r = await acknowledgeDebtDue(deps, { profileId: "p1", userId: "u1", debtId: "c1", cycleIso: "2026-06", response: "paid" });
    expect(isErr(r)).toBe(true);
  });
});
