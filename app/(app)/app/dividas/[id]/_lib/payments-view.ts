export type PaymentsHero =
  | { kind: "paidOff"; abatedCents: bigint }
  | { kind: "partial"; abatedCents: bigint; originalCents: bigint; currentCents: bigint }
  | { kind: "empty" };

export interface PaymentsView {
  hero: PaymentsHero;
  totalInterestCents: bigint;
  collapsedByDefault: boolean;
}

export function buildPaymentsView(args: {
  originalCents: bigint;
  currentCents: bigint;
  interestPortionsCents: bigint[];
}): PaymentsView {
  const { originalCents, currentCents, interestPortionsCents } = args;
  const abatedCents = originalCents - currentCents;
  const totalInterestCents = interestPortionsCents.reduce((acc, n) => acc + n, 0n);

  let hero: PaymentsHero;
  if (abatedCents > 0n && currentCents <= 0n) {
    hero = { kind: "paidOff", abatedCents };
  } else if (abatedCents > 0n && currentCents > 0n) {
    hero = { kind: "partial", abatedCents, originalCents, currentCents };
  } else {
    hero = { kind: "empty" };
  }

  return { hero, totalInterestCents, collapsedByDefault: hero.kind === "paidOff" };
}
