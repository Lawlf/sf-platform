import { describe, expect, it, vi } from "vitest";

import type { Subscription } from "@/domain/entities/subscription.entity";
import type { UserEntity } from "@/domain/entities/user.entity";

vi.mock("@/infrastructure/email/email-renderer", () => ({
  renderEmailToHtml: vi.fn().mockResolvedValue("<html></html>"),
}));
vi.mock("@/infrastructure/email/unsubscribe-token", () => ({
  buildUnsubscribeUrl: vi.fn(() => "https://app.test/email/unsubscribe?token=x"),
  buildUnsubscribeHeaders: vi.fn(() => ({ "List-Unsubscribe": "<https://app.test/x>" })),
}));

import { dispatchWinbackEmail } from "./dispatch-winback-email.use-case";

function endedSub(userId: string): Subscription {
  return { id: `sub-${userId}`, userId, endedAt: new Date() } as Subscription;
}

function user(id: string, opts: Partial<UserEntity>): UserEntity {
  return {
    id,
    email: `${id}@test`,
    displayName: null,
    isPro: false,
    plan: "free",
    deactivatedAt: null,
    ...opts,
  } as UserEntity;
}

const clock = { now: () => new Date("2026-06-15T13:00:00Z") };

function sends(over: Partial<{ hasSentSince: unknown; recordSend: unknown }> = {}) {
  return {
    hasSentSince: vi.fn().mockResolvedValue(false),
    recordSend: vi.fn().mockResolvedValue({ recorded: true }),
    ...over,
  };
}

describe("dispatchWinbackEmail", () => {
  it("emails a churned Free user once, dedupes, and skips users who returned to Pro", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const findById = vi.fn(async (id: string) =>
      id === "a" ? user("a", { isPro: false }) : user("b", { isPro: true, plan: "pro" }),
    );

    const result = await dispatchWinbackEmail({
      subscriptions: {
        findEndedBetween: vi.fn().mockResolvedValue([endedSub("a"), endedSub("b"), endedSub("a")]),
      } as never,
      users: { findById } as never,
      preferences: { findForUser: vi.fn().mockResolvedValue(null) } as never,
      emailSends: sends() as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });

    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "a@test", purpose: "transactional" }));
  });

  it("skips when the subscription was already recorded (dedupe)", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await dispatchWinbackEmail({
      subscriptions: { findEndedBetween: vi.fn().mockResolvedValue([endedSub("a")]) } as never,
      users: { findById: vi.fn().mockResolvedValue(user("a", {})) } as never,
      preferences: { findForUser: vi.fn().mockResolvedValue(null) } as never,
      emailSends: sends({ recordSend: vi.fn().mockResolvedValue({ recorded: false }) }) as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    expect(result.sent).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("queries the ~14-day window", async () => {
    const findEndedBetween = vi.fn().mockResolvedValue([]);
    await dispatchWinbackEmail({
      subscriptions: { findEndedBetween } as never,
      users: { findById: vi.fn() } as never,
      preferences: { findForUser: vi.fn() } as never,
      emailSends: sends() as never,
      email: { send: vi.fn() } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    const [start, end] = findEndedBetween.mock.calls[0] ?? [];
    const dayMs = 24 * 60 * 60 * 1000;
    expect(end.getTime()).toBe(clock.now().getTime() - 14 * dayMs);
    expect(start.getTime()).toBe(clock.now().getTime() - 15 * dayMs);
  });

  it("skips when promotions are off", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await dispatchWinbackEmail({
      subscriptions: { findEndedBetween: vi.fn().mockResolvedValue([endedSub("a")]) } as never,
      users: { findById: vi.fn().mockResolvedValue(user("a", {})) } as never,
      preferences: {
        findForUser: vi.fn().mockResolvedValue({ emailEnabled: true, promotionsEnabled: false }),
      } as never,
      emailSends: sends() as never,
      email: { send } as never,
      clock: clock as never,
      appUrl: "https://app.test",
    });
    expect(result.sent).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});
