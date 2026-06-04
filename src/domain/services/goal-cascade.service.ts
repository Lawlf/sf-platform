export type CascadeGoalKind = "accumulate" | "payoff";
export type CascadeMode = "queue" | "parallel";

export interface CascadeGoalInput {
  goalId: string;
  /** accumulate: current saved balance; payoff: current debt balance. cents. */
  balanceCents: bigint;
  /** accumulate: target to reach. payoff: ignored (completion = balance <= 0). cents. */
  targetCents: bigint;
  kind: CascadeGoalKind;
  /** monthly compounding rate as a decimal (0.008 ~ 10%/yr). >= 0. */
  monthlyRate: number;
  mode: CascadeMode;
  /** queue priority; lower funded first. Ignored when mode === "parallel". */
  order: number;
  /** fraction of the month's free cash skimmed off the top, 0..1. Used only when mode === "parallel". */
  parallelFraction: number;
}

export interface CascadeGoalResult {
  goalId: string;
  /** 1-based month the goal first received a contribution; null if never funded. */
  fundingStartMonth: number | null;
  /** 1-based month the goal completed; 0 if already complete at start; null if not within horizon. */
  etaMonth: number | null;
  reachedWithinHorizon: boolean;
}

export interface CascadeInput {
  goals: CascadeGoalInput[];
  monthlyFreeCashFlowCents: bigint;
  horizonMonths: number;
}

export interface CascadeResult {
  goals: CascadeGoalResult[];
}

interface GoalState {
  input: CascadeGoalInput;
  balance: number;
  done: boolean;
  etaMonth: number | null;
  fundingStartMonth: number | null;
}

function toReais(cents: bigint): number {
  return Number(cents) / 100;
}

function isComplete(state: GoalState): boolean {
  if (state.input.kind === "accumulate") {
    return state.balance >= toReais(state.input.targetCents);
  }
  return state.balance <= 0;
}

function remainingNeed(state: GoalState): number {
  if (state.input.kind === "accumulate") {
    return Math.max(0, toReais(state.input.targetCents) - state.balance);
  }
  return Math.max(0, state.balance);
}

function byPriority(a: GoalState, b: GoalState): number {
  const orderDiff = a.input.order - b.input.order;
  if (orderDiff !== 0) return orderDiff;
  return a.input.goalId.localeCompare(b.input.goalId);
}

function applyContribution(state: GoalState, amount: number, month: number): void {
  if (amount <= 0) return;
  if (state.fundingStartMonth === null) state.fundingStartMonth = month;
  if (state.input.kind === "accumulate") {
    state.balance += amount;
  } else {
    state.balance -= amount;
  }
}

export class GoalCascadeService {
  static simulate(input: CascadeInput): CascadeResult {
    const freeBase = Math.max(0, toReais(input.monthlyFreeCashFlowCents));

    const states: GoalState[] = input.goals.map((g) => ({
      input: g,
      balance: toReais(g.balanceCents),
      done: false,
      etaMonth: null,
      fundingStartMonth: null,
    }));

    for (const s of states) {
      if (isComplete(s)) {
        s.done = true;
        s.etaMonth = 0;
      }
    }

    for (let month = 1; month <= input.horizonMonths; month++) {
      const incomplete = states.filter((s) => !s.done);
      if (incomplete.length === 0) break;

      // 1. Growth phase (once per month).
      for (const s of incomplete) {
        if (s.input.monthlyRate !== 0) {
          s.balance = s.balance * (1 + s.input.monthlyRate);
        }
      }

      // 2. Allocation phase.
      let remaining = freeBase;

      // 2a. Parallel skims off the top, capped at each goal's remaining need.
      const parallel = incomplete.filter((s) => s.input.mode === "parallel").sort(byPriority);
      for (const s of parallel) {
        if (remaining <= 0) break;
        const want = freeBase * s.input.parallelFraction;
        const give = Math.min(want, remainingNeed(s), remaining);
        applyContribution(s, give, month);
        remaining -= give;
      }

      // 2b. Queue pour with mid-month overflow.
      const queue = incomplete
        .filter((s) => s.input.mode === "queue")
        .sort(byPriority);
      for (const s of queue) {
        if (remaining <= 0) break;
        const give = Math.min(remaining, remainingNeed(s));
        applyContribution(s, give, month);
        remaining -= give;
      }

      // 3. Completion check.
      for (const s of incomplete) {
        if (!s.done && isComplete(s)) {
          s.done = true;
          s.etaMonth = month;
        }
      }
    }

    return {
      goals: states.map((s) => ({
        goalId: s.input.goalId,
        fundingStartMonth: s.fundingStartMonth,
        etaMonth: s.etaMonth,
        reachedWithinHorizon: s.done,
      })),
    };
  }
}
