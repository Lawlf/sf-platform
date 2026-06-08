import { describe, expect, it, vi } from "vitest";

import type { LiteUser } from "@/domain/ports/repositories/user-activity.repository";

vi.mock("@/infrastructure/email/email-renderer", () => ({
  renderEmailToHtml: vi.fn().mockResolvedValue("<html></html>"),
}));
vi.mock("@/infrastructure/email/unsubscribe-token", () => ({
  buildUnsubscribeUrl: vi.fn(() => "https://app.test/email/unsubscribe?token=x"),
  buildUnsubscribeHeaders: vi.fn(() => ({ "List-Unsubscribe": "<https://app.test/x>" })),
}));

import { dispatchUpsellEmail } from "./dispatch-upsell-email.use-case";

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

describe("dispatchUpsellEmail", () => {
  it("queries engaged free users (active 30d, account >14d)", async () => {
    const findEngagedFreeUsers = vi.fn().mockResolvedValue([]);
    await dispatchUpsellEmail({
      userActivity: { findEngagedFreeUsers } as never,
      preferences: { findForUser: vi.fn() } as never,
      emailSends: sends() as never,
      email: { send: vi.fn() } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    const arg = findEngagedFreeUsers.mock.calls[0]?.[0] as { activeSince: Date; createdBefore: Date };
    const dayMs = 24 * 60 * 60 * 1000;
    expect((clock.now().getTime() - arg.activeSince.getTime()) / dayMs).toBe(30);
    expect((clock.now().getTime() - arg.createdBefore.getTime()) / dayMs).toBe(14);
  });

  it("emails once, respects promotions opt-out", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const findForUser = vi.fn(async (id: string) =>
      id === "u2" ? { emailEnabled: true, promotionsEnabled: false } : null,
    );
    const result = await dispatchUpsellEmail({
      userActivity: {
        findEngagedFreeUsers: vi.fn().mockResolvedValue([user("u1", "a@test"), user("u2", "b@test")]),
      } as never,
      preferences: { findForUser } as never,
      emailSends: sends() as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "a@test" }));
  });

  it("dedupes (upsell sent once ever)", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await dispatchUpsellEmail({
      userActivity: { findEngagedFreeUsers: vi.fn().mockResolvedValue([user("u1", "a@test")]) } as never,
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
