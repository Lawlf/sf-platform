import { describe, expect, it, vi } from "vitest";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { ProfileEntity } from "@/domain/entities/profile.entity";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { isOk } from "@/shared/errors/result";

import { createMeiProfile, type CreateMeiProfileDeps } from "./create-mei-profile.use-case";

const NOW = new Date("2026-06-18T00:00:00Z");

function makeClock() {
  return { now: vi.fn(() => NOW) };
}

function makeProfile(over: Partial<ProfileEntity> = {}): ProfileEntity {
  return {
    id: "pf-id",
    userId: "u1",
    type: "PF",
    linkedProfileId: null,
    displayName: null,
    isPrimary: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

function makeProfileRepo(initial: ProfileEntity[] = []): ProfileRepositoryPort & {
  _profiles: ProfileEntity[];
  _linkedUpdates: Array<{ profileId: string; linkedProfileId: string }>;
} {
  const store: ProfileEntity[] = [...initial];
  const linkedUpdates: Array<{ profileId: string; linkedProfileId: string }> = [];

  return {
    _profiles: store,
    _linkedUpdates: linkedUpdates,
    listForUser: vi.fn(async (_userId: string) => [...store]),
    findById: vi.fn(async (id: string) => store.find((p) => p.id === id) ?? null),
    findPrimaryPf: vi.fn(async (userId: string) => store.find((p) => p.userId === userId && p.isPrimary) ?? null),
    ensurePfProfile: vi.fn(async (_userId: string, _now: Date) => {
      const existing = store.find((p) => p.type === "PF");
      if (existing) return existing;
      const pf = makeProfile({ id: "pf-id", type: "PF", isPrimary: true });
      store.push(pf);
      return pf;
    }),
    create: vi.fn(async (input: Parameters<ProfileRepositoryPort["create"]>[0]) => {
      const entity = makeProfile({
        id: `profile-${store.length + 1}`,
        type: input.type,
        linkedProfileId: input.linkedProfileId,
        displayName: input.displayName,
        isPrimary: input.isPrimary,
        userId: input.userId,
      });
      store.push(entity);
      return entity;
    }),
    setLinkedProfile: vi.fn(async (profileId: string, linkedProfileId: string) => {
      linkedUpdates.push({ profileId, linkedProfileId });
      const idx = store.findIndex((p) => p.id === profileId);
      if (idx >= 0) store[idx] = { ...store[idx]!, linkedProfileId };
    }),
  };
}

function makeDebtRepo(): DebtRepositoryPort & { _created: DebtEntity[] } {
  const created: DebtEntity[] = [];
  return {
    _created: created,
    findById: vi.fn(),
    listForProfile: vi.fn(async () => []),
    create: vi.fn(async (entity: DebtEntity) => {
      created.push(entity);
      return entity;
    }),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
}

function makeDeps(
  profileRepo: ProfileRepositoryPort,
  debtRepo: DebtRepositoryPort,
): CreateMeiProfileDeps {
  return { profiles: profileRepo, debts: debtRepo, clock: makeClock() };
}

describe("createMeiProfile", () => {
  it("creates PJ linked to PF on both sides", async () => {
    const profileRepo = makeProfileRepo();
    const debtRepo = makeDebtRepo();
    const deps = makeDeps(profileRepo, debtRepo);

    const result = await createMeiProfile(deps, { userId: "u1" });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const { pf, pj } = result.value;
    expect(pf.type).toBe("PF");
    expect(pj.type).toBe("PJ_MEI");
    expect(pj.linkedProfileId).toBe(pf.id);

    expect(profileRepo._linkedUpdates).toContainEqual({ profileId: pf.id, linkedProfileId: pj.id });
  });

  it("seeds DAS debt on the PJ profile", async () => {
    const profileRepo = makeProfileRepo();
    const debtRepo = makeDebtRepo();
    const deps = makeDeps(profileRepo, debtRepo);

    const result = await createMeiProfile(deps, { userId: "u1" });
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const { pj } = result.value;
    expect(debtRepo._created).toHaveLength(1);
    const das = debtRepo._created[0]!;
    expect(das.profileId).toBe(pj.id);
    expect(das.label).toBe("DAS");
    expect(das.kind).toBe("recurring");
    expect(das.recurringAmountCents).toBe(7690n);
    expect(das.expenseCategory).toBe("das-mei");
    expect((das as Extract<typeof das, { kind: "recurring" }>).dueDay).toBe(20);
  });

  it("is idempotent: second call returns existing PJ without duplicating DAS", async () => {
    const profileRepo = makeProfileRepo();
    const debtRepo = makeDebtRepo();
    const deps = makeDeps(profileRepo, debtRepo);

    await createMeiProfile(deps, { userId: "u1" });
    expect(debtRepo._created).toHaveLength(1);

    await createMeiProfile(deps, { userId: "u1" });
    expect(debtRepo._created).toHaveLength(1);
    expect(profileRepo._profiles.filter((p) => p.type === "PJ_MEI")).toHaveLength(1);
  });

  it("returns the existing PJ profile when already created", async () => {
    const pf = makeProfile({ id: "pf-id", type: "PF" });
    const pj = makeProfile({ id: "pj-id", type: "PJ_MEI", linkedProfileId: "pf-id" });
    const profileRepo = makeProfileRepo([pf, pj]);
    const debtRepo = makeDebtRepo();
    const deps = makeDeps(profileRepo, debtRepo);

    const result = await createMeiProfile(deps, { userId: "u1" });
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.pj.id).toBe("pj-id");
    expect(debtRepo._created).toHaveLength(0);
  });
});
