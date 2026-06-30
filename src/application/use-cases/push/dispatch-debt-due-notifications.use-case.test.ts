import { describe, expect, it, vi } from "vitest";

import type { CreditCardDebt } from "@/domain/entities/debt.entity";
import type { NotificationPreferencesEntity } from "@/domain/entities/notification-preferences.entity";
import type { PushSubscriptionEntity } from "@/domain/entities/push-subscription.entity";
import type { UserEntity } from "@/domain/entities/user.entity";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { NotificationPreferencesRepositoryPort } from "@/domain/ports/repositories/notification-preferences.repository";
import type { PushSubscriptionRepositoryPort } from "@/domain/ports/repositories/push-subscription.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { PushPayload, PushService } from "@/domain/ports/services/push.service";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { dispatchDebtDueNotifications } from "./dispatch-debt-due-notifications.use-case";

function money(value: number): Money {
  const r = Money.from(value);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeUser(over: Partial<UserEntity> = {}): UserEntity {
  return { id: "user-1", isPro: true, ...(over as object) } as UserEntity;
}

function makePrefs(over: Partial<NotificationPreferencesEntity> = {}): NotificationPreferencesEntity {
  return {
    userId: "user-1",
    pushEnabled: true,
    emailEnabled: true,
    debtDueEnabled: true,
    debtDueDaysBefore: 3,
    assetPriceEnabled: true,
    monthlySummaryEnabled: true,
    promotionsEnabled: true,
    newsEnabled: true,
    newsletterEnabled: true,
    updatedAt: new Date("2026-01-01"),
    ...over,
  };
}

function makeCreditCard(over: Partial<CreditCardDebt> = {}): CreditCardDebt {
  const stmt = over.currentStatement ?? money(1500);
  return {
    id: over.id ?? "debt-cc",
    userId: "user-1",
    profileId: "profile-1",
    label: over.label ?? "Cartão Nubank",
    status: "active",
    originalPrincipal: stmt,
    currentBalance: stmt,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "credit_card",
    creditLimit: money(10000),
    statementDay: 5,
    dueDay: over.dueDay ?? 15,
    currentStatement: stmt,
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [],
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...over,
  };
}

function makeSub(): PushSubscriptionEntity {
  return {
    id: "sub-1",
    userId: "user-1",
    endpoint: "https://push.example/abc",
    p256dh: "key",
    auth: "auth",
    userAgent: null,
    lastSeenAt: new Date("2026-01-01"),
    createdAt: new Date("2026-01-01"),
  };
}

function makeDeps(opts: {
  pro?: UserEntity[];
  prefs?: NotificationPreferencesEntity | null;
  debts?: CreditCardDebt[];
  subs?: PushSubscriptionEntity[];
  now: Date;
}) {
  const send = vi.fn(async (): Promise<{ status: "ok" }> => ({ status: "ok" }));
  const pushService = { send } as unknown as PushService;
  const pushSubscriptions = {
    listForUser: vi.fn(async () => opts.subs ?? [makeSub()]),
    deleteByEndpoint: vi.fn(),
    findByEndpoint: vi.fn(),
    upsert: vi.fn(),
    touchLastSeen: vi.fn(),
    deleteForUser: vi.fn(),
  } as unknown as PushSubscriptionRepositoryPort;
  const preferences = {
    findForUser: vi.fn(async () => opts.prefs ?? makePrefs()),
    upsert: vi.fn(),
  } as unknown as NotificationPreferencesRepositoryPort;
  const users = {
    findAllPro: vi.fn(async () => opts.pro ?? [makeUser()]),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    markOnboardingWizardSeen: vi.fn(),
    markHomeTourDismissed: vi.fn(),
    deactivate: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  } as unknown as UserRepositoryPort;
  const debts = {
    listForProfile: vi.fn(async () => opts.debts ?? []),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
  } as unknown as DebtRepositoryPort;
  const clock = { now: vi.fn(() => opts.now) };
  const resolveProfileId = vi.fn(async () => "profile-1");
  return { pushService, pushSubscriptions, preferences, users, debts, clock, send, resolveProfileId };
}

function lastPayload(send: ReturnType<typeof vi.fn>): PushPayload {
  return send.mock.calls.at(-1)![1] as PushPayload;
}

describe("dispatchDebtDueNotifications", () => {
  it("sends nothing when there are no Pro users", async () => {
    const deps = makeDeps({ pro: [], now: new Date(2026, 4, 10) });
    const result = await dispatchDebtDueNotifications(deps);
    expect(result.pushesSent).toBe(0);
    expect(result.usersTargeted).toBe(0);
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("notifies when a debt's next due date is exactly daysBefore away", async () => {
    // now 2026-05-10, dueDay 13 -> due 2026-05-13 -> 3 days, prefs daysBefore=3
    const deps = makeDeps({
      now: new Date(2026, 4, 10),
      debts: [makeCreditCard({ dueDay: 13, label: "Cartão Nubank" })],
    });
    const result = await dispatchDebtDueNotifications(deps);
    expect(result.pushesSent).toBe(1);
    expect(result.usersTargeted).toBe(1);
    expect(deps.send).toHaveBeenCalledTimes(1);
    const payload = lastPayload(deps.send);
    expect(payload.body).toContain("Cartão Nubank");
    expect(payload.body).toContain("3 dias");
  });

  it("does not notify when the due date is outside the chosen window", async () => {
    // due in 5 days, prefs daysBefore=3
    const deps = makeDeps({
      now: new Date(2026, 4, 10),
      debts: [makeCreditCard({ dueDay: 15 })],
    });
    const result = await dispatchDebtDueNotifications(deps);
    expect(result.pushesSent).toBe(0);
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("respects the user's chosen antecedence (daysBefore=7)", async () => {
    const deps = makeDeps({
      now: new Date(2026, 4, 10),
      prefs: makePrefs({ debtDueDaysBefore: 7 }),
      debts: [makeCreditCard({ dueDay: 17 })], // 7 days away
    });
    const result = await dispatchDebtDueNotifications(deps);
    expect(result.pushesSent).toBe(1);
    expect(lastPayload(deps.send).body).toContain("7 dias");
  });

  it("says 'hoje' when daysBefore is 0 and a parcel is due today", async () => {
    const deps = makeDeps({
      now: new Date(2026, 4, 13),
      prefs: makePrefs({ debtDueDaysBefore: 0 }),
      debts: [makeCreditCard({ dueDay: 13 })],
    });
    const result = await dispatchDebtDueNotifications(deps);
    expect(result.pushesSent).toBe(1);
    expect(lastPayload(deps.send).body).toContain("hoje");
  });

  it("batches multiple parcels in the same window into a single push", async () => {
    const deps = makeDeps({
      now: new Date(2026, 4, 10),
      debts: [
        makeCreditCard({ id: "cc-a", label: "Cartão A", dueDay: 13 }),
        makeCreditCard({ id: "cc-b", label: "Cartão B", dueDay: 13 }),
      ],
    });
    const result = await dispatchDebtDueNotifications(deps);
    expect(result.pushesSent).toBe(1);
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(lastPayload(deps.send).body).toContain("2 parcelas");
  });

  it("skips users with debtDueEnabled off", async () => {
    const deps = makeDeps({
      now: new Date(2026, 4, 10),
      prefs: makePrefs({ debtDueEnabled: false }),
      debts: [makeCreditCard({ dueDay: 13 })],
    });
    const result = await dispatchDebtDueNotifications(deps);
    expect(result.pushesSent).toBe(0);
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("skips when the master push switch is off", async () => {
    const deps = makeDeps({
      now: new Date(2026, 4, 10),
      prefs: makePrefs({ pushEnabled: false }),
      debts: [makeCreditCard({ dueDay: 13 })],
    });
    const result = await dispatchDebtDueNotifications(deps);
    expect(result.pushesSent).toBe(0);
    expect(deps.send).not.toHaveBeenCalled();
  });
});
