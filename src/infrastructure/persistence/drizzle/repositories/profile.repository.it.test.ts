import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "../client";
import { profiles } from "../schema/profiles.schema";
import { users } from "../schema/users.schema";
import { ProfileRepository } from "./profile.repository";

const repo = new ProfileRepository();

async function makeUser(email: string): Promise<string> {
  const rows = await getDb().insert(users).values({ email }).returning();
  return rows[0]!.id;
}

describe("ProfileRepository (integration)", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    for (const id of createdUserIds) {
      await getDb().delete(users).where(eq(users.id, id));
    }
    createdUserIds.length = 0;
  });

  it("ensurePfProfile cria o PF uma vez e é idempotente em chamadas repetidas", async () => {
    const userId = await makeUser(`pf-${crypto.randomUUID()}@t.dev`);
    createdUserIds.push(userId);
    const now = new Date();

    const first = await repo.ensurePfProfile(userId, now);
    const second = await repo.ensurePfProfile(userId, now);

    expect(first.type).toBe("PF");
    expect(first.userId).toBe(userId);
    expect(second.id).toBe(first.id);

    const all = await repo.listForUser(userId);
    expect(all.filter((p) => p.type === "PF")).toHaveLength(1);
  });
});
