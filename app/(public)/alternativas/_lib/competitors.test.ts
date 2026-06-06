import { describe, expect, it } from "vitest";

import { COMPETITORS, competitorSlugs, getCompetitor } from "./competitors";

describe("competitors registry", () => {
  it("retorna o Mobills pelo slug", () => {
    const c = getCompetitor("mobills");
    expect(c).toBeDefined();
    expect(c?.competitorName).toBe("Mobills");
    expect(c?.h1.length).toBeGreaterThan(0);
    expect(c?.answerBlock.length).toBeGreaterThan(0);
  });
  it("retorna undefined para slug inexistente", () => {
    expect(getCompetitor("nao-existe")).toBeUndefined();
  });
  it("lista os slugs", () => {
    expect(competitorSlugs()).toContain("mobills");
  });
  it("nao tem slugs duplicados", () => {
    const s = competitorSlugs();
    expect(new Set(s).size).toBe(s.length);
  });
  it("cada entrada tem tabela, listas e faq preenchidas", () => {
    for (const c of COMPETITORS) {
      expect(c.comparison.length).toBeGreaterThan(0);
      expect(c.whenCompetitor.length).toBeGreaterThan(0);
      expect(c.whenUs.length).toBeGreaterThan(0);
      expect(c.howToStart.length).toBeGreaterThan(0);
      expect(c.faq.length).toBeGreaterThan(0);
    }
  });
});
