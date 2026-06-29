import { describe, expect, it, vi } from "vitest";

import type { NotificationPreferencesEntity } from "@/domain/entities/notification-preferences.entity";
import type { PushSubscriptionEntity } from "@/domain/entities/push-subscription.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import type { NotificationPreferencesRepositoryPort } from "@/domain/ports/repositories/notification-preferences.repository";
import type { PushSubscriptionRepositoryPort } from "@/domain/ports/repositories/push-subscription.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { PushService } from "@/domain/ports/services/push.service";
import { ok } from "@/shared/errors/result";

import type { OverdueItem } from "@/application/use-cases/debt/get-overdue-debts.use-case";
import type { DispatchOverdueDeps } from "./dispatch-overdue-notifications.use-case";
import { dispatchOverdueNotifications } from "./dispatch-overdue-notifications.use-case";

function makeUser(): UserEntity {
  return {
    id: "u1",
    email: "user@example.com",
    emailVerifiedAt: new Date(2026, 0, 1),
    displayName: null,
    role: "user",
    plan: "pro",
    isPro: true,
    proGraceUntil: null,
    freeKeptProfileId: null,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    onboardingWizardSeenAt: null,
    homeTourDismissedAt: null,
    acquisitionChannel: null,
    acquisitionChannelOther: null,
    quickAccess: [],
    username: null,
    profileFlair: null,
    baseCurrency: "BRL",
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
  };
}

function makePrefs(overrides: Partial<NotificationPreferencesEntity> = {}): NotificationPreferencesEntity {
  return {
    userId: "u1",
    pushEnabled: true,
    emailEnabled: true,
    debtDueEnabled: true,
    debtDueDaysBefore: 0,
    assetPriceEnabled: true,
    monthlySummaryEnabled: true,
    promotionsEnabled: true,
    newsEnabled: true,
    newsletterEnabled: true,
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function makeSub(): PushSubscriptionEntity {
  return {
    id: "sub-1",
    userId: "u1",
    endpoint: "e",
    p256dh: "k",
    auth: "a",
    userAgent: null,
    lastSeenAt: new Date(2026, 0, 1),
    createdAt: new Date(2026, 0, 1),
  };
}

function makeUserRepo(): UserRepositoryPort {
  return {
    findById: vi.fn(async () => null),
    findByUsername: vi.fn(async () => null),
    findByEmail: vi.fn(async () => null),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    markOnboardingWizardSeen: vi.fn(),
    markHomeTourDismissed: vi.fn(),
    deactivate: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    findAllPro: vi.fn(async () => [makeUser()]),
    findAllActive: vi.fn(async () => []),
  };
}

function makePrefsRepo(prefs: NotificationPreferencesEntity | null): NotificationPreferencesRepositoryPort {
  return {
    findForUser: vi.fn(async () => prefs),
    upsert: vi.fn(),
  };
}

function makePushSubRepo(): PushSubscriptionRepositoryPort {
  return {
    findByEndpoint: vi.fn(async () => null),
    listForUser: vi.fn(async () => [makeSub()]),
    upsert: vi.fn(),
    touchLastSeen: vi.fn(),
    deleteByEndpoint: vi.fn(),
    deleteForUser: vi.fn(),
  };
}

function makePushService(): { service: PushService; sent: number[] } {
  const sent: number[] = [];
  const service: PushService = {
    send: vi.fn(async () => { sent.push(1); return { status: "ok" as const }; }),
  };
  return { service, sent };
}

function baseDeps(
  over: OverdueItem[],
  prefs: NotificationPreferencesEntity = makePrefs(),
): { deps: DispatchOverdueDeps; sent: number[] } {
  const { service, sent } = makePushService();
  const deps: DispatchOverdueDeps = {
    users: makeUserRepo(),
    preferences: makePrefsRepo(prefs),
    detectOverdue: vi.fn(async () => ok({ created: over })),
    resolveProfileId: vi.fn(async () => "p1"),
    pushService: service,
    pushSubscriptions: makePushSubRepo(),
  };
  return { deps, sent };
}

describe("dispatchOverdueNotifications", () => {
  it("envia um push quando há vencido novo", async () => {
    const { deps } = baseDeps([{ debtId: "c1", label: "Cartão", kind: "credit_card", dueDate: new Date(2026, 5, 10), cycleIso: "2026-06", amount: null }]);
    const r = await dispatchOverdueNotifications(deps);
    expect(r.pushesSent).toBeGreaterThan(0);
  });

  it("não envia push quando não há vencido novo (dedup)", async () => {
    const { deps } = baseDeps([]);
    const r = await dispatchOverdueNotifications(deps);
    expect(r.pushesSent).toBe(0);
  });

  it("pula quem desligou push ou debtDue", async () => {
    const { deps } = baseDeps(
      [{ debtId: "c1", label: "X", kind: "credit_card", dueDate: new Date(), cycleIso: "2026-06", amount: null }],
      makePrefs({ pushEnabled: false }),
    );
    const r = await dispatchOverdueNotifications(deps);
    expect(r.pushesSent).toBe(0);
  });
});
