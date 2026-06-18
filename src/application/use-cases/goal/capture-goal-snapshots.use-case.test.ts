import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GoalSnapshotEntity } from "@/domain/entities/goal-snapshot.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalMacro } from "@/domain/services/goal-progress.service";

import type { CaptureGoalSnapshotsDeps } from "./capture-goal-snapshots.use-case";
import { captureGoalSnapshots } from "./capture-goal-snapshots.use-case";

const GOAL_ID = "goal-1";
const USER_ID = "user-1";

function makeSavingsGoal(overrides: Partial<GoalEntity> = {}): GoalEntity {
  return {
    id: GOAL_ID,
    userId: USER_ID,
    profileId: "profile-1",
    householdId: null,
    type: "savings",
    title: "Reserva viagem",
    status: "active",
    targetCents: 1000n,
    manualSavedCents: 1000n,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: null,
    fundingMode: "manual",
    monthlyCostCents: null,
    realReturnPct: null,
    cascadeOrder: null,
    cascadeMode: null,
    cascadeParallelPct: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeMinimalMacro(): GoalMacro {
  return {
    investedCents: 0n,
    cashReserveCents: 0n,
    contributionCents: 0n,
    monthlyServiceCents: 0n,
    monthlyIncomeCents: 0n,
    debts: [],
  };
}

describe("captureGoalSnapshots", () => {
  const upsert = vi.fn().mockResolvedValue(undefined);
  const update = vi.fn().mockResolvedValue(null);
  const listAllActive = vi.fn();
  const buildMacro = vi.fn();

  const deps: CaptureGoalSnapshotsDeps = {
    goals: { listAllActive, update } as CaptureGoalSnapshotsDeps["goals"],
    snapshots: { upsert } as CaptureGoalSnapshotsDeps["snapshots"],
    buildMacro: buildMacro as CaptureGoalSnapshotsDeps["buildMacro"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts snapshot and marks goal reached when savings goal is complete", async () => {
    const now = new Date("2026-05-15T12:00:00Z");
    listAllActive.mockResolvedValue([makeSavingsGoal()]);
    buildMacro.mockResolvedValue(makeMinimalMacro());

    const result = await captureGoalSnapshots(deps, { now });

    expect(upsert).toHaveBeenCalledOnce();
    const snapshot = upsert.mock.calls[0]![0] as GoalSnapshotEntity;
    expect(snapshot.goalId).toBe(GOAL_ID);
    // month should be first of May 2026 UTC
    expect(snapshot.month.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(snapshot.currentCents).toBe(1000n);
    expect(snapshot.targetCents).toBe(1000n);
    expect(snapshot.capturedAt).toBe(now);

    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(GOAL_ID, { status: "reached" });

    expect(result.snapshotsWritten).toBe(1);
    expect(result.reached).toHaveLength(1);
    expect(result.reached[0]).toMatchObject({
      goalId: GOAL_ID,
      userId: USER_ID,
      title: "Reserva viagem",
    });
  });

  it("does not update status when goal is not reached", async () => {
    const now = new Date("2026-05-01T00:00:00Z");
    listAllActive.mockResolvedValue([makeSavingsGoal({ manualSavedCents: 500n })]);
    buildMacro.mockResolvedValue(makeMinimalMacro());

    const result = await captureGoalSnapshots(deps, { now });

    expect(upsert).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
    expect(result.snapshotsWritten).toBe(1);
    expect(result.reached).toHaveLength(0);
  });

  it("calls buildMacro once per user even with multiple goals", async () => {
    const now = new Date("2026-05-01T00:00:00Z");
    listAllActive.mockResolvedValue([
      makeSavingsGoal({ id: "g1", manualSavedCents: 500n }),
      makeSavingsGoal({ id: "g2", manualSavedCents: 800n }),
    ]);
    buildMacro.mockResolvedValue(makeMinimalMacro());

    const result = await captureGoalSnapshots(deps, { now });

    expect(buildMacro).toHaveBeenCalledOnce();
    expect(buildMacro).toHaveBeenCalledWith(USER_ID);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(result.snapshotsWritten).toBe(2);
  });

  it("returns empty reached array when no goals are active", async () => {
    listAllActive.mockResolvedValue([]);
    const now = new Date("2026-05-01T00:00:00Z");

    const result = await captureGoalSnapshots(deps, { now });

    expect(upsert).not.toHaveBeenCalled();
    expect(result.snapshotsWritten).toBe(0);
    expect(result.reached).toHaveLength(0);
  });
});
