export interface FreeBalanceState {
  accumulatedCents: bigint;
  committedCoveredCents: bigint;
  monthIso: string | null;
}

export interface FreeBalanceEventResult {
  entrouCents: bigint;
  jaTemDonoCents: bigint;
  livreCents: bigint;
  accumulatedCents: bigint;
  next: FreeBalanceState;
}

export interface FreeBalanceEventInput {
  eventAmountCents: bigint;
  owedCents: bigint;
  monthIso: string;
}

export const FreeBalanceService = {
  applyEvent(state: FreeBalanceState, event: FreeBalanceEventInput): FreeBalanceEventResult {
    const covered = state.monthIso === event.monthIso ? state.committedCoveredCents : 0n;
    const remainingOwed = event.owedCents > covered ? event.owedCents - covered : 0n;
    const jaTemDono =
      event.eventAmountCents < remainingOwed ? event.eventAmountCents : remainingOwed;
    const livre = event.eventAmountCents - jaTemDono;
    const accumulated = state.accumulatedCents + livre;

    return {
      entrouCents: event.eventAmountCents,
      jaTemDonoCents: jaTemDono,
      livreCents: livre,
      accumulatedCents: accumulated,
      next: {
        accumulatedCents: accumulated,
        committedCoveredCents: covered + jaTemDono,
        monthIso: event.monthIso,
      },
    };
  },
};
