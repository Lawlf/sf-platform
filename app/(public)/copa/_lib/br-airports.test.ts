import { describe, expect, it } from "vitest";

import { BR_AIRPORTS, searchAirports } from "./br-airports";

describe("BR_AIRPORTS", () => {
  it("has unique IATA codes and valid Brazilian coordinates", () => {
    const seen = new Set<string>();
    for (const a of BR_AIRPORTS) {
      expect(a.iata).toMatch(/^[A-Z]{3}$/);
      expect(seen.has(a.iata)).toBe(false);
      seen.add(a.iata);
      expect(a.lat).toBeGreaterThan(-35);
      expect(a.lat).toBeLessThan(6);
      expect(a.lon).toBeGreaterThan(-75);
      expect(a.lon).toBeLessThan(-28);
    }
    expect(BR_AIRPORTS.length).toBeGreaterThanOrEqual(30);
  });
});

describe("searchAirports", () => {
  it("finds São Paulo ignoring accents and case", () => {
    const r = searchAirports("sao paulo");
    expect(r.some((a) => a.iata === "GRU")).toBe(true);
  });

  it("finds by IATA code", () => {
    const r = searchAirports("gig");
    expect(r[0]?.iata).toBe("GIG");
  });

  it("returns at most 8 results and empty for blank query", () => {
    expect(searchAirports("")).toEqual([]);
    expect(searchAirports("a").length).toBeLessThanOrEqual(8);
  });
});
