import { describe, expect, it } from "vitest";

import type { Plan } from "@/domain/entities/plan.entity";
import type { Subscription } from "@/domain/entities/subscription.entity";

import { getProfileIdentity, type GetProfileIdentityDeps } from "./get-profile-identity.use-case";

function deps(over: {
  activeSub?: Subscription | null; plan?: Plan | null;
}): GetProfileIdentityDeps {
  return {
    subscriptions: { findActiveByUserId: async () => over.activeSub ?? null },
    plans: { findById: async () => over.plan ?? null },
  };
}

const planLifetime = { id: "p1", billingInterval: "lifetime" } as unknown as Plan;
const planYear = { id: "p2", billingInterval: "year" } as unknown as Plan;
const sub = (planId: string) => ({ planId } as unknown as Subscription);

describe("getProfileIdentity", () => {
  it("free -> tier free, sem supporter chip", async () => {
    const r = await getProfileIdentity(deps({}), {
      userId: "u1", isPro: false, isAdmin: false, flair: null, consistencyTier: "Começo",
    });
    expect(r.supporterTier).toBe("free");
    expect(r.badges.some((b) => b.kind === "supporter")).toBe(false);
  });

  it("lifetime -> founder", async () => {
    const r = await getProfileIdentity(deps({ activeSub: sub("p1"), plan: planLifetime }), {
      userId: "u1", isPro: true, isAdmin: false, flair: null, consistencyTier: "Começo",
    });
    expect(r.supporterTier).toBe("founder");
    expect(r.badges.some((b) => b.kind === "founder")).toBe(true);
  });

  it("pro anual -> pro_year + flair chip", async () => {
    const r = await getProfileIdentity(deps({ activeSub: sub("p2"), plan: planYear }), {
      userId: "u1", isPro: true, isAdmin: false, flair: "cauteloso", consistencyTier: "No ritmo",
    });
    expect(r.supporterTier).toBe("pro_year");
    expect(r.badges.find((b) => b.kind === "supporter")!.label).toBe("Pro Anual");
    expect(r.badges.some((b) => b.kind === "flair")).toBe(true);
  });

  it("pro sem assinatura resolvível -> pro_month", async () => {
    const r = await getProfileIdentity(deps({ activeSub: null }), {
      userId: "u1", isPro: true, isAdmin: false, flair: null, consistencyTier: "Começo",
    });
    expect(r.supporterTier).toBe("pro_month");
  });
});
