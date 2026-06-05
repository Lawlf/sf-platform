export interface CompoundPoint {
  year: number;
  valueCents: bigint;
}

export interface CompoundProjection {
  points: CompoundPoint[];
  finalCents: bigint;
}

export function compoundProjection(input: {
  amountCents: bigint;
  annualRatePct: number;
  years: number;
}): CompoundProjection {
  const amount = Number(input.amountCents) / 100;
  const r = Number.isFinite(input.annualRatePct) ? input.annualRatePct / 100 : 0;
  const years = Math.max(0, Math.trunc(input.years));
  const points: CompoundPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const v = amount * Math.pow(1 + r, y);
    points.push({ year: y, valueCents: BigInt(Math.round(v * 100)) });
  }
  return { points, finalCents: points[points.length - 1]!.valueCents };
}
