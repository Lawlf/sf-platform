import { describe, expect, it } from "vitest";

import { WorldCupTripCostService, type TripCostKnobs } from "./world-cup-trip-cost.service";

const knobs: TripCostKnobs = {
  flightBaseCents: 120_000n,
  flightPerKmCents: 50,
  seasonSurge: 1.4,
  hotelNightlyCents: 70_000n,
  dailyExtrasCents: 40_000n,
  visaCents: 100_000n,
  insurancePerDayCents: 4_000n,
  estimateSpreadPct: 0.18,
};

describe("WorldCupTripCostService.estimate", () => {
  it("computes flight with base, per-km and season surge", () => {
    const r = WorldCupTripCostService.estimate(
      { distanceKm: 7500, nights: 4, ticketPriceCents: 170_000n, people: 1, needsVisa: false, monthlySavingCents: null },
      knobs,
    );
    // (120000 + 50*7500) * 1.4 = (120000 + 375000) * 1.4 = 693000
    expect(r.flightCents).toBe(693_000n);
  });

  it("omits visa when not needed and includes it when needed", () => {
    const base = { distanceKm: 5000, nights: 3, ticketPriceCents: 170_000n, people: 1, monthlySavingCents: null };
    const without = WorldCupTripCostService.estimate({ ...base, needsVisa: false }, knobs);
    const withVisa = WorldCupTripCostService.estimate({ ...base, needsVisa: true }, knobs);
    expect(without.visaCents).toBe(0n);
    expect(withVisa.visaCents).toBe(100_000n);
    expect(withVisa.perPersonCents - without.perPersonCents).toBe(100_000n);
  });

  it("multiplies total by number of people but keeps per-person stable", () => {
    const one = WorldCupTripCostService.estimate(
      { distanceKm: 6000, nights: 4, ticketPriceCents: 340_000n, people: 1, needsVisa: true, monthlySavingCents: null },
      knobs,
    );
    const three = WorldCupTripCostService.estimate(
      { distanceKm: 6000, nights: 4, ticketPriceCents: 340_000n, people: 3, needsVisa: true, monthlySavingCents: null },
      knobs,
    );
    expect(three.perPersonCents).toBe(one.perPersonCents);
    expect(three.totalCents).toBe(one.perPersonCents * 3n);
  });

  it("brackets the total with a symmetric min/max spread", () => {
    const r = WorldCupTripCostService.estimate(
      { distanceKm: 7500, nights: 4, ticketPriceCents: 170_000n, people: 2, needsVisa: false, monthlySavingCents: null },
      knobs,
    );
    expect(r.minCents < r.totalCents).toBe(true);
    expect(r.maxCents > r.totalCents).toBe(true);
    // spread 18%
    expect(Number(r.minCents)).toBeCloseTo(Number(r.totalCents) * 0.82, -2);
    expect(Number(r.maxCents)).toBeCloseTo(Number(r.totalCents) * 1.18, -2);
    // independent assertions: flight round((120000+50*7500)*1.4)=693000; hotel 70000*4=280000; ticket 170000; extras 40000*(4+1)=200000; visa 0; insurance 4000*(4+1)=20000; perPerson=1_363_000; total *2=2_726_000
    expect(r.totalCents).toBe(2_726_000n);
    expect(r.minCents).toBe(2_235_320n);
    expect(r.maxCents).toBe(3_216_680n);
  });

  it("returns months to save when a monthly saving is given, else null", () => {
    const noSave = WorldCupTripCostService.estimate(
      { distanceKm: 7500, nights: 4, ticketPriceCents: 170_000n, people: 1, needsVisa: false, monthlySavingCents: null },
      knobs,
    );
    expect(noSave.savingMonths).toBeNull();

    const withSave = WorldCupTripCostService.estimate(
      { distanceKm: 7500, nights: 4, ticketPriceCents: 170_000n, people: 1, needsVisa: false, monthlySavingCents: 100_000n },
      knobs,
    );
    // ceil(total / 100000)
    expect(withSave.savingMonths).toBe(Math.ceil(Number(withSave.totalCents) / 100_000));
    expect(withSave.savingMonths).toBeGreaterThan(0);
    // independent assertions: perPerson total for 1 person = 1_363_000; ceil(1_363_000/100_000)=14
    expect(withSave.totalCents).toBe(1_363_000n);
    expect(withSave.savingMonths).toBe(14);
  });
});
