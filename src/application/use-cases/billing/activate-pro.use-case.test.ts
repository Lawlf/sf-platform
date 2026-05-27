import { describe, expect, it, vi } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";

import { activatePro } from "./activate-pro.use-case";

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "user_1",
    email: "test@example.com",
    emailVerifiedAt: new Date(),
    displayName: "Teste",
    role: "user",
    plan: "free",
    isPro: false,
    deactivatedAt: null,
    deactivationReason: null,
    contentDiagnosticAnswer: null,
    contentDiagnosticAnsweredAt: null,
    quickAccess: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDeps(user: UserEntity) {
  const usersUpdated: UserEntity[] = [];
  const emailsSent: { to: string; subject: string }[] = [];
  return {
    users: {
      findById: vi.fn(async (id: string) => (id === user.id ? user : null)),
      update: vi.fn(async (u: UserEntity) => {
        usersUpdated.push(u);
      }),
    } as unknown as UserRepository,
    email: {
      send: vi.fn(async (m: { to: string; subject: string }) => {
        emailsSent.push({ to: m.to, subject: m.subject });
      }),
    } as unknown as EmailService,
    clock: { now: () => new Date("2026-05-22T12:00:00Z") } satisfies Clock,
    appUrl: "https://saborfinanceiro.com.br",
    usersUpdated,
    emailsSent,
  };
}

describe("activatePro", () => {
  it("flips Free to Pro and sends welcome email", async () => {
    const user = makeUser({ isPro: false, plan: "free" });
    const deps = makeDeps(user);
    await activatePro(deps, user.id);
    expect(deps.usersUpdated[0]?.isPro).toBe(true);
    expect(deps.usersUpdated[0]?.plan).toBe("pro");
    expect(deps.emailsSent).toHaveLength(1);
    expect(deps.emailsSent[0]?.subject).toMatch(/Pro/);
  });

  it("does not re-send email when already Pro", async () => {
    const user = makeUser({ isPro: true, plan: "pro" });
    const deps = makeDeps(user);
    await activatePro(deps, user.id);
    expect(deps.emailsSent).toHaveLength(0);
    expect(deps.usersUpdated).toHaveLength(0);
  });

  it("is a no-op when user not found", async () => {
    const user = makeUser();
    const deps = makeDeps(user);
    await activatePro(deps, "missing");
    expect(deps.usersUpdated).toHaveLength(0);
    expect(deps.emailsSent).toHaveLength(0);
  });
});
