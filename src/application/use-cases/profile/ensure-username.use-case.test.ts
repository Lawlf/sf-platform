import { describe, expect, it } from "vitest";

import type { UserEntity } from "@/domain/entities/user.entity";

import { ensureUsername, type EnsureUsernameDeps } from "./ensure-username.use-case";

function user(over: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "u1", email: "arthur@x.com", emailVerifiedAt: null, displayName: "Arthur Fernandes",
    role: "user", plan: "free", isPro: false, deactivatedAt: null, deactivationReason: null,
    contentDiagnosticAnswer: null, contentDiagnosticAnsweredAt: null, onboardingWizardSeenAt: null,
    homeTourDismissedAt: null, quickAccess: [], baseCurrency: "BRL", username: null, profileFlair: null,
    createdAt: new Date(), updatedAt: new Date(), ...over,
  };
}

function deps(opts: { current: UserEntity; taken?: Set<string> }): { deps: EnsureUsernameDeps; saved: UserEntity[] } {
  const saved: UserEntity[] = [];
  const taken = opts.taken ?? new Set<string>();
  return {
    saved,
    deps: {
      users: {
        findById: async () => opts.current,
        findByUsername: async (u: string) => (taken.has(u) ? user({ id: "other", username: u }) : null),
        update: async (u: UserEntity) => { saved.push(u); },
      },
    },
  };
}

describe("ensureUsername", () => {
  it("gera e persiste quando falta", async () => {
    const { deps: d, saved } = deps({ current: user({ username: null }) });
    const result = await ensureUsername(d, { userId: "u1" });
    expect(result).toBe("arthur_fernandes");
    expect(saved[0]!.username).toBe("arthur_fernandes");
  });

  it("colisão gera sufixo", async () => {
    const { deps: d } = deps({ current: user({ username: null }), taken: new Set(["arthur_fernandes"]) });
    const result = await ensureUsername(d, { userId: "u1" });
    expect(result).toBe("arthur_fernandes2");
  });

  it("idempotente quando já tem", async () => {
    const { deps: d, saved } = deps({ current: user({ username: "ja_tenho" }) });
    const result = await ensureUsername(d, { userId: "u1" });
    expect(result).toBe("ja_tenho");
    expect(saved).toHaveLength(0);
  });

  it("usa parte local do email quando displayName vazio", async () => {
    const { deps: d } = deps({ current: user({ username: null, displayName: null, email: "joao.silva@x.com" }) });
    const result = await ensureUsername(d, { userId: "u1" });
    expect(result).toBe("joao_silva");
  });
});
