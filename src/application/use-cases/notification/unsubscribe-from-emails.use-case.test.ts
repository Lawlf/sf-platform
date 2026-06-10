import { describe, expect, it, vi } from "vitest";

import type { NotificationPreferencesEntity } from "@/domain/entities/notification-preferences.entity";
import type { NotificationPreferencesRepositoryPort } from "@/domain/ports/repositories/notification-preferences.repository";

import { unsubscribeFromEmails } from "./unsubscribe-from-emails.use-case";

function makeRepo(existing: NotificationPreferencesEntity | null) {
  const upsert = vi.fn().mockResolvedValue(undefined);
  const repo: NotificationPreferencesRepositoryPort = {
    findForUser: vi.fn().mockResolvedValue(existing),
    upsert,
  };
  return { repo, upsert };
}

describe("unsubscribeFromEmails", () => {
  it("turns off monthly summary, leaving the others on (no prefs row yet)", async () => {
    const { repo, upsert } = makeRepo(null);
    await unsubscribeFromEmails({ preferences: repo }, { userId: "u1", category: "monthly" });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        emailEnabled: true,
        monthlySummaryEnabled: false,
        promotionsEnabled: true,
        newsletterEnabled: true,
      }),
    );
  });

  it("category 'all' flips the email master switch off", async () => {
    const { repo, upsert } = makeRepo(null);
    await unsubscribeFromEmails({ preferences: repo }, { userId: "u1", category: "all" });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ emailEnabled: false }));
  });

  it("preserves existing toggles while turning off the requested one", async () => {
    const existing: NotificationPreferencesEntity = {
      userId: "u1",
      pushEnabled: false,
      emailEnabled: true,
      debtDueEnabled: false,
      debtDueDaysBefore: 7,
      assetPriceEnabled: false,
      monthlySummaryEnabled: true,
      promotionsEnabled: true,
      newsEnabled: true,
      newsletterEnabled: true,
      updatedAt: new Date("2026-01-01"),
    };
    const { repo, upsert } = makeRepo(existing);
    await unsubscribeFromEmails({ preferences: repo }, { userId: "u1", category: "promotions" });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        pushEnabled: false,
        debtDueDaysBefore: 7,
        assetPriceEnabled: false,
        promotionsEnabled: false,
      }),
    );
  });
});
