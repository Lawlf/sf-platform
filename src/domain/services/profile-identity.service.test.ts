import { describe, expect, it } from "vitest";

import {
  FLAIR_CATALOG,
  RESERVED_USERNAMES,
  buildProfileBadges,
  flairFor,
  generateUsernameBase,
  resolveSupporterTier,
} from "./profile-identity.service";

describe("resolveSupporterTier", () => {
  it("mapeia plano + intervalo", () => {
    expect(resolveSupporterTier({ isPro: false, billingInterval: null })).toBe("free");
    expect(resolveSupporterTier({ isPro: true, billingInterval: "lifetime" })).toBe("founder");
    expect(resolveSupporterTier({ isPro: true, billingInterval: "year" })).toBe("pro_year");
    expect(resolveSupporterTier({ isPro: true, billingInterval: "month" })).toBe("pro_month");
    expect(resolveSupporterTier({ isPro: true, billingInterval: null })).toBe("pro_month");
  });
});

describe("flairFor", () => {
  it("valida key contra catálogo", () => {
    expect(flairFor("cauteloso")?.iconName).toBe("Anchor");
    expect(flairFor("cauteloso")?.description.length).toBeGreaterThan(0);
    expect(flairFor(null)).toBeNull();
    expect(flairFor("inexistente")).toBeNull();
  });
  it("catálogo tem 3 itens", () => {
    expect(FLAIR_CATALOG).toHaveLength(3);
  });
});

describe("buildProfileBadges", () => {
  const base = {
    supporterTier: "free" as const,
    isAdmin: false,
    flair: null,
    consistencyTier: "Começo",
  };

  it("free sem flair sem consistência: vazio", () => {
    expect(buildProfileBadges(base)).toEqual([]);
  });

  it("ordem: staff, founder, flair, consistency", () => {
    const b = buildProfileBadges({ ...base, supporterTier: "founder", isAdmin: true, flair: "cauteloso", consistencyTier: "No ritmo" });
    expect(b.map((x) => x.kind)).toEqual(["staff", "founder", "flair", "consistency"]);
  });

  it("pro (não founder) mostra supporter, não founder", () => {
    const b = buildProfileBadges({ ...base, supporterTier: "pro_year" });
    expect(b.map((x) => x.kind)).toContain("supporter");
    expect(b.map((x) => x.kind)).not.toContain("founder");
    expect(b.find((x) => x.kind === "supporter")!.label).toBe("Pro Anual");
  });

  it("consistência só aparece se != Começo", () => {
    expect(buildProfileBadges({ ...base, consistencyTier: "Começo" }).some((x) => x.kind === "consistency")).toBe(false);
    expect(buildProfileBadges({ ...base, consistencyTier: "Constância" }).some((x) => x.kind === "consistency")).toBe(true);
  });

  it("corta em 5 badges", () => {
    const b = buildProfileBadges({ supporterTier: "founder", isAdmin: true, flair: "cauteloso", consistencyTier: "No ritmo" });
    expect(b.length).toBeLessThanOrEqual(5);
  });

  it("todo badge tem description; flair/supporter têm howTo, staff não", () => {
    const b = buildProfileBadges({ ...base, supporterTier: "pro_month", flair: "cauteloso", isAdmin: true });
    for (const x of b) expect(x.description.length).toBeGreaterThan(0);
    expect(b.find((x) => x.kind === "staff")!.howTo).toBeNull();
    expect(b.find((x) => x.kind === "supporter")!.howTo).not.toBeNull();
    expect(b.find((x) => x.kind === "flair")!.howTo).not.toBeNull();
  });
});

describe("generateUsernameBase", () => {
  it("slugifica nome com acento e espaço", () => {
    expect(generateUsernameBase("Arthur Fernandes")).toBe("arthur_fernandes");
    expect(generateUsernameBase("José da Silva")).toBe("jose_da_silva");
  });
  it("remove caracteres inválidos", () => {
    expect(generateUsernameBase("Ana@123!")).toBe("ana123");
  });
  it("corta no tamanho limite (15)", () => {
    expect(generateUsernameBase("abcdefghijklmnopqrstuvwxyz").length).toBe(15);
  });
  it("fonte vazia vira user", () => {
    expect(generateUsernameBase("")).toBe("user");
    expect(generateUsernameBase("@@@")).toBe("user");
  });
  it("reservado vira user", () => {
    expect(RESERVED_USERNAMES).toContain("admin");
    expect(generateUsernameBase("admin")).toBe("user");
  });
});
