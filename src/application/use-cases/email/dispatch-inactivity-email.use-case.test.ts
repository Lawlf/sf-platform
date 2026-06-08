import { describe, expect, it, vi } from "vitest";

import type { LiteUser } from "@/domain/ports/repositories/user-activity.repository";

vi.mock("@/infrastructure/email/email-renderer", () => ({
  renderEmailToHtml: vi.fn().mockResolvedValue("<html></html>"),
}));
vi.mock("@/infrastructure/email/unsubscribe-token", () => ({
  buildUnsubscribeUrl: vi.fn(() => "https://app.test/email/unsubscribe?token=x"),
  buildUnsubscribeHeaders: vi.fn(() => ({ "List-Unsubscribe": "<https://app.test/x>" })),
}));

import { dispatchInactivityEmail } from "./dispatch-inactivity-email.use-case";

function user(id: string, email: string): LiteUser {
  return { id, email, displayName: null };
}

const clock = { now: () => new Date("2026-06-15T13:00:00Z") };

function sends(over: Partial<{ recordSend: unknown }> = {}) {
  return {
    hasSentSince: vi.fn().mockResolvedValue(false),
    recordSend: vi.fn().mockResolvedValue({ recorded: true }),
    ...over,
  };
}

describe("dispatchInactivityEmail", () => {
  it("queries the ~45-day lapse window", async () => {
    const findLapsed = vi.fn().mockResolvedValue([]);
    await dispatchInactivityEmail({
      userActivity: { findLapsed } as never,
      preferences: { findForUser: vi.fn() } as never,
      emailSends: sends() as never,
      email: { send: vi.fn() } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    const [start, end] = findLapsed.mock.calls[0] ?? [];
    const dayMs = 24 * 60 * 60 * 1000;
    expect(end.getTime()).toBe(clock.now().getTime() - 45 * dayMs);
    expect(start.getTime()).toBe(clock.now().getTime() - 46 * dayMs);
  });

  it("emails lapsed users and respects the email master switch", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const findForUser = vi.fn(async (id: string) =>
      id === "u2" ? { emailEnabled: false } : null,
    );
    const result = await dispatchInactivityEmail({
      userActivity: {
        findLapsed: vi.fn().mockResolvedValue([user("u1", "a@test"), user("u2", "b@test")]),
      } as never,
      preferences: { findForUser } as never,
      emailSends: sends() as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "a@test", purpose: "transactional" }));
  });

  it("dedupes (already sent today)", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await dispatchInactivityEmail({
      userActivity: { findLapsed: vi.fn().mockResolvedValue([user("u1", "a@test")]) } as never,
      preferences: { findForUser: vi.fn().mockResolvedValue(null) } as never,
      emailSends: sends({ recordSend: vi.fn().mockResolvedValue({ recorded: false }) }) as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    expect(result.sent).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});
