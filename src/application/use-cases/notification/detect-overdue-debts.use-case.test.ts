import { describe, expect, it } from "vitest";
import { isOk, ok } from "@/shared/errors/result";
import { detectOverdueDebts } from "./detect-overdue-debts.use-case";

const clock = { now: () => new Date(2026, 5, 15) };

function makeDeps(overdue: any[], existing: boolean) {
  const created: any[] = [];
  return {
    deps: {
      getOverdue: async () => ok(overdue) as any,
      notifications: {
        findByUserAndKindAndMonth: async () => (existing ? ({ id: "n1" } as any) : null),
        create: async (e: any) => {
          created.push(e);
          return e;
        },
      },
      clock,
    },
    created,
  };
}

describe("detectOverdueDebts", () => {
  it("cria notif para item vencido sem notif prévia", async () => {
    const { deps, created } = makeDeps(
      [
        {
          debtId: "c1",
          label: "Cartão Nubank",
          dueDate: new Date(2026, 5, 10),
          cycleIso: "2026-06",
          amount: null,
        },
      ],
      false,
    );
    const res = await detectOverdueDebts(deps as any, { userId: "u1", profileId: "p1" });
    expect(created).toHaveLength(1);
    expect(created[0].kind).toBe("payment_overdue");
    expect(created[0].monthIso).toBe("2026-06");
    expect(isOk(res) && res.value.created).toHaveLength(1);
  });

  it("é idempotente: não recria se já existe notif do ciclo", async () => {
    const { deps, created } = makeDeps(
      [
        {
          debtId: "c1",
          label: "Cartão",
          dueDate: new Date(2026, 5, 10),
          cycleIso: "2026-06",
          amount: null,
        },
      ],
      true,
    );
    const res = await detectOverdueDebts(deps as any, { userId: "u1", profileId: "p1" });
    expect(created).toHaveLength(0);
    expect(isOk(res) && res.value.created).toHaveLength(0);
  });
});
