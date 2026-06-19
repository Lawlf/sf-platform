import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { MeiMonthlyRepository } from "./mei-monthly.repository";
import { ProfileRepository } from "./profile.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-mei-monthly-user@saborfinanceiro.com.br";

const users = new UserRepository();
const profiles = new ProfileRepository();
const repo = new MeiMonthlyRepository();

let userId: string;
let profileId: string;

const JAN_2025 = new Date("2025-01-01");
const FEB_2025 = new Date("2025-02-01");

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
  const profile = await profiles.ensurePfProfile(userId, new Date());
  profileId = profile.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from mei_monthly where profile_id = ${profileId}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function makeEntity(competencia: Date, overrides: { proLaboreCents?: bigint; gastoPessoalPjCents?: bigint } = {}) {
  return {
    id: randomUUID(),
    profileId,
    competencia,
    proLaboreCents: overrides.proLaboreCents ?? 200000n,
    gastoPessoalPjCents: overrides.gastoPessoalPjCents ?? 50000n,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("MeiMonthlyRepository (integration)", () => {
  it("findByProfileCompetencia returns null when no row exists", async () => {
    const result = await repo.findByProfileCompetencia(profileId, JAN_2025);
    expect(result).toBeNull();
  });

  it("upsert creates a row; findByProfileCompetencia returns it", async () => {
    const entity = makeEntity(JAN_2025);
    const saved = await repo.upsert(entity);

    expect(saved.profileId).toBe(profileId);
    expect(saved.competencia).toEqual(JAN_2025);
    expect(saved.proLaboreCents).toBe(200000n);
    expect(saved.gastoPessoalPjCents).toBe(50000n);
    expect(saved.createdAt).toBeInstanceOf(Date);
    expect(saved.updatedAt).toBeInstanceOf(Date);

    const found = await repo.findByProfileCompetencia(profileId, JAN_2025);
    expect(found).not.toBeNull();
    expect(found?.profileId).toBe(profileId);
    expect(found?.proLaboreCents).toBe(200000n);
  });

  it("upsert is idempotent: two upserts for same competencia produce one row with updated values", async () => {
    const first = makeEntity(JAN_2025, { proLaboreCents: 100000n, gastoPessoalPjCents: 30000n });
    await repo.upsert(first);

    await new Promise((resolve) => setTimeout(resolve, 5));

    const second = makeEntity(JAN_2025, { proLaboreCents: 150000n, gastoPessoalPjCents: 40000n });
    const updated = await repo.upsert(second);

    expect(updated.proLaboreCents).toBe(150000n);
    expect(updated.gastoPessoalPjCents).toBe(40000n);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(first.updatedAt.getTime());

    const found = await repo.findByProfileCompetencia(profileId, JAN_2025);
    expect(found?.proLaboreCents).toBe(150000n);

    const all = await repo.listForProfile(profileId);
    expect(all).toHaveLength(1);
  });

  it("listForProfile returns multiple competencias ordered by competencia desc", async () => {
    await repo.upsert(makeEntity(JAN_2025));
    await repo.upsert(makeEntity(FEB_2025));

    const list = await repo.listForProfile(profileId);
    expect(list).toHaveLength(2);
    expect(list[0]?.competencia).toEqual(FEB_2025);
    expect(list[1]?.competencia).toEqual(JAN_2025);
  });

  it("listForProfile returns empty array when no rows", async () => {
    const list = await repo.listForProfile(profileId);
    expect(list).toHaveLength(0);
  });
});
