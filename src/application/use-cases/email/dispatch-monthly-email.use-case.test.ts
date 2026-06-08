import { describe, expect, it, vi } from "vitest";

import type { LiteUser } from "@/domain/ports/repositories/user-activity.repository";

vi.mock("@/infrastructure/email/email-renderer", () => ({
  renderEmailToHtml: vi.fn().mockResolvedValue("<html></html>"),
}));
vi.mock("@/infrastructure/email/unsubscribe-token", () => ({
  buildUnsubscribeUrl: vi.fn(() => "https://app.test/email/unsubscribe?token=x"),
  buildUnsubscribeHeaders: vi.fn(() => ({ "List-Unsubscribe": "<https://app.test/x>" })),
}));

import { dispatchMonthlyEmail } from "./dispatch-monthly-email.use-case";

function user(id: string, email: string): LiteUser {
  return { id, email, displayName: null };
}

const clock = { now: () => new Date("2026-06-15T13:00:00Z") };

function sends(over: Partial<{ hasSentSince: unknown; recordSend: unknown }> = {}) {
  return {
    hasSentSince: vi.fn().mockResolvedValue(false),
    recordSend: vi.fn().mockResolvedValue({ recorded: true }),
    ...over,
  };
}

describe("dispatchMonthlyEmail", () => {
  it("sends to engaged users without prefs, skips those who opted out", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const findForUser = vi.fn(async (id: string) =>
      id === "u2" ? { emailEnabled: true, monthlySummaryEnabled: false } : null,
    );

    const result = await dispatchMonthlyEmail({
      userActivity: {
        findActiveSince: vi.fn().mockResolvedValue([user("u1", "a@test"), user("u2", "b@test")]),
      } as never,
      preferences: { findForUser } as never,
      emailSends: sends() as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });

    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@test",
        subject: "Virou junho. Bora fechar o mês?",
        purpose: "transactional",
        headers: expect.objectContaining({ "List-Unsubscribe": expect.any(String) }),
      }),
    );
  });

  it("only targets users active within the window (findActiveSince)", async () => {
    const findActiveSince = vi.fn().mockResolvedValue([]);
    await dispatchMonthlyEmail({
      userActivity: { findActiveSince } as never,
      preferences: { findForUser: vi.fn() } as never,
      emailSends: sends() as never,
      email: { send: vi.fn() } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    const since = findActiveSince.mock.calls[0]?.[0] as Date;
    const days = (clock.now().getTime() - since.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(45);
  });

  it("suppresses users who got another lifecycle email in the last 5 days", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await dispatchMonthlyEmail({
      userActivity: { findActiveSince: vi.fn().mockResolvedValue([user("u1", "a@test")]) } as never,
      preferences: { findForUser: vi.fn().mockResolvedValue(null) } as never,
      emailSends: sends({ hasSentSince: vi.fn().mockResolvedValue(true) }) as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    expect(result.sent).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("skips when this period was already recorded (dedupe / rerun)", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await dispatchMonthlyEmail({
      userActivity: { findActiveSince: vi.fn().mockResolvedValue([user("u1", "a@test")]) } as never,
      preferences: { findForUser: vi.fn().mockResolvedValue(null) } as never,
      emailSends: sends({ recordSend: vi.fn().mockResolvedValue({ recorded: false }) }) as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    expect(result.sent).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("one failed send does not abort the batch", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(undefined);
    const result = await dispatchMonthlyEmail({
      userActivity: {
        findActiveSince: vi.fn().mockResolvedValue([user("u1", "a@test"), user("u2", "b@test")]),
      } as never,
      preferences: { findForUser: vi.fn().mockResolvedValue(null) } as never,
      emailSends: sends() as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
