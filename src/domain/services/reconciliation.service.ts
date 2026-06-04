export type ReconciliationStatus = "on_track" | "leaked" | "ahead";

export interface ReconciliationInput {
  theoreticalFreeCashFlowCents: bigint;
  netWorthDeltaCents: bigint;
}

export interface ReconciliationResult {
  leakCents: bigint;
  status: ReconciliationStatus;
}

export class ReconciliationService {
  static compute(input: ReconciliationInput): ReconciliationResult {
    const leakCents = input.theoreticalFreeCashFlowCents - input.netWorthDeltaCents;
    const status: ReconciliationStatus =
      leakCents > 0n ? "leaked" : leakCents < 0n ? "ahead" : "on_track";
    return { leakCents, status };
  }
}
