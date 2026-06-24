import { describe, expect, it } from "vitest";

import { ok } from "@/shared/errors/result";

import { dispatchOverdueNotifications } from "./dispatch-overdue-notifications.use-case";

function baseDeps(over: any[]) {
  const sent: any[] = [];
  return {
    users: { findAllPro: async () => [{ id: "u1" }] },
    preferences: { findForUser: async () => ({ pushEnabled: true, debtDueEnabled: true }) },
    detectOverdue: async () => ok({ created: over }),
    resolveProfileId: async () => "p1",
    pushService: { send: async () => { sent.push(1); return { status: "ok" as const }; } },
    pushSubscriptions: { listForUser: async () => [{ endpoint: "e", p256dh: "k", auth: "a" }], deleteByEndpoint: async () => {} },
    _sent: sent,
  };
}

describe("dispatchOverdueNotifications", () => {
  it("envia um push quando há vencido novo", async () => {
    const deps = baseDeps([{ debtId: "c1", label: "Cartão", dueDate: new Date(2026, 5, 10), cycleIso: "2026-06", amount: null }]);
    const r = await dispatchOverdueNotifications(deps as any);
    expect(r.pushesSent).toBeGreaterThan(0);
  });

  it("não envia push quando não há vencido novo (dedup)", async () => {
    const deps = baseDeps([]);
    const r = await dispatchOverdueNotifications(deps as any);
    expect(r.pushesSent).toBe(0);
  });

  it("pula quem desligou push ou debtDue", async () => {
    const deps = baseDeps([{ debtId: "c1", label: "X", dueDate: new Date(), cycleIso: "2026-06", amount: null }]);
    deps.preferences.findForUser = async () => ({ pushEnabled: false, debtDueEnabled: true }) as any;
    const r = await dispatchOverdueNotifications(deps as any);
    expect(r.pushesSent).toBe(0);
  });
});
