import { describe, expect, it } from "vitest";

import { activeCopaMatches, COPA_MATCHES, COST_CONFIG, getCopaMatch } from "./copa-2026.config";

describe("copa 2026 config", () => {
  it("exposes brasil-vs-noruega as an active match", () => {
    const match = getCopaMatch("brasil-vs-noruega");
    expect(match).toBeDefined();
    expect(match?.active).toBe(true);
    expect(match?.homeTeam).toBe("Brasil");
    expect(match?.awayTeam).toBe("Noruega");
  });

  it("every match has ticket categories with unique ids, ordered priciest first, positive BRL prices", () => {
    for (const match of COPA_MATCHES) {
      expect(match.ticketCategories.length).toBeGreaterThanOrEqual(2);
      const ids = match.ticketCategories.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      const prices = match.ticketCategories.map((c) => Number(c.priceCents));
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
      for (const c of match.ticketCategories) expect(c.priceCents > 0n).toBe(true);
      expect(match.venue.lat).toBeGreaterThan(35);
      expect(match.venue.lon).toBeLessThan(-70);
    }
  });

  it("activeCopaMatches returns only active matches", () => {
    expect(activeCopaMatches().every((m) => m.active)).toBe(true);
  });

  it("cost config has a positive estimate spread and season surge above 1", () => {
    expect(COST_CONFIG.estimateSpreadPct).toBeGreaterThan(0);
    expect(COST_CONFIG.estimateSpreadPct).toBeLessThan(1);
    expect(COST_CONFIG.seasonSurge).toBeGreaterThan(1);
  });
});
