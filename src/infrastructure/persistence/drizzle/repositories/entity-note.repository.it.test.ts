import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { EntityNoteRepository } from "./entity-note.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-entity-note@saborfinanceiro.com.br";
const users = new UserRepository();
const repo = new EntityNoteRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from entity_notes where user_id = ${userId}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

describe("EntityNoteRepository (integration)", () => {
  it("upsert insere e depois atualiza a mesma entidade (1 nota só)", async () => {
    const entityId = randomUUID();
    const now = new Date();
    await repo.upsert({
      id: randomUUID(),
      userId,
      entityType: "debt",
      entityId,
      body: "primeira versão",
      updatedAt: now,
    });
    await repo.upsert({
      id: randomUUID(),
      userId,
      entityType: "debt",
      entityId,
      body: "segunda versão",
      updatedAt: new Date(now.getTime() + 1000),
    });
    const found = await repo.find(userId, "debt", entityId);
    expect(found?.body).toBe("segunda versão");
  });

  it("find retorna null quando não existe nota", async () => {
    const found = await repo.find(userId, "goal", randomUUID());
    expect(found).toBeNull();
  });

  it("deleteForEntity remove a nota", async () => {
    const entityId = randomUUID();
    await repo.upsert({
      id: randomUUID(),
      userId,
      entityType: "income",
      entityId,
      body: "apaga isto",
      updatedAt: new Date(),
    });
    await repo.deleteForEntity(userId, "income", entityId);
    expect(await repo.find(userId, "income", entityId)).toBeNull();
  });
});
