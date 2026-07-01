export interface TripCostKnobs {
  flightBaseCents: bigint;
  flightPerKmCents: number;
  seasonSurge: number;
  hotelNightlyCents: bigint;
  dailyExtrasCents: bigint;
  visaCents: bigint;
  insurancePerDayCents: bigint;
  estimateSpreadPct: number;
}

export interface TripSelection {
  distanceKm: number;
  nights: number;
  ticketPriceCents: bigint;
  people: number;
  needsVisa: boolean;
  monthlySavingCents: bigint | null;
}

export interface TripCostBreakdown {
  flightCents: bigint;
  hotelCents: bigint;
  ticketCents: bigint;
  extrasCents: bigint;
  visaCents: bigint;
  insuranceCents: bigint;
  perPersonCents: bigint;
  totalCents: bigint;
  minCents: bigint;
  maxCents: bigint;
  savingMonths: number | null;
}

function roundCents(value: number): bigint {
  if (!Number.isFinite(value) || value <= 0) return 0n;
  return BigInt(Math.round(value));
}

export class WorldCupTripCostService {
  static estimate(selection: TripSelection, knobs: TripCostKnobs): TripCostBreakdown {
    const nights = Math.max(0, Math.trunc(selection.nights));
    const people = Math.max(1, Math.trunc(selection.people));
    const days = nights + 1;

    const flightRaw =
      (Number(knobs.flightBaseCents) + knobs.flightPerKmCents * Math.max(0, selection.distanceKm)) *
      knobs.seasonSurge;
    const flightCents = roundCents(flightRaw);
    const hotelCents = knobs.hotelNightlyCents * BigInt(nights);
    const ticketCents = selection.ticketPriceCents;
    const extrasCents = knobs.dailyExtrasCents * BigInt(days);
    const visaCents = selection.needsVisa ? knobs.visaCents : 0n;
    const insuranceCents = knobs.insurancePerDayCents * BigInt(days);

    const perPersonCents =
      flightCents + hotelCents + ticketCents + extrasCents + visaCents + insuranceCents;
    const totalCents = perPersonCents * BigInt(people);

    const minCents = roundCents(Number(totalCents) * (1 - knobs.estimateSpreadPct));
    const maxCents = roundCents(Number(totalCents) * (1 + knobs.estimateSpreadPct));

    const savingMonths =
      selection.monthlySavingCents && selection.monthlySavingCents > 0n
        ? Math.ceil(Number(totalCents) / Number(selection.monthlySavingCents))
        : null;

    return {
      flightCents,
      hotelCents,
      ticketCents,
      extrasCents,
      visaCents,
      insuranceCents,
      perPersonCents,
      totalCents,
      minCents,
      maxCents,
      savingMonths,
    };
  }
}
