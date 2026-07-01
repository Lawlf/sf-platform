import { describe, expect, it } from "vitest";

import { haversineKm } from "./geo-distance";

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ lat: -23.43, lon: -46.47 }, { lat: -23.43, lon: -46.47 })).toBe(0);
  });

  it("approximates GRU (São Paulo) to EWR (Newark) as ~7500 km", () => {
    const gru = { lat: -23.4356, lon: -46.4731 };
    const ewr = { lat: 40.6925, lon: -74.1687 };
    const km = haversineKm(gru, ewr);
    expect(km).toBeGreaterThan(7300);
    expect(km).toBeLessThan(7900);
  });

  it("is symmetric", () => {
    const a = { lat: -8.13, lon: -34.92 };
    const b = { lat: 40.69, lon: -74.17 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});
