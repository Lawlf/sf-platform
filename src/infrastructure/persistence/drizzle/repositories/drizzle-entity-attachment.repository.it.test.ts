import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { EntityAttachmentEntity } from "@/domain/entities/entity-attachment.entity";

import { closeDb, getDb } from "../client";

import { DrizzleEntityAttachmentRepository } from "./drizzle-entity-attachment.repository";
import { DrizzleUserRepository } from "./drizzle-user.repository";

const TEST_EMAIL = "it-test-entity-attachment@saborfinanceiro.com.br";
const users = new DrizzleUserRepository();
const repo = new DrizzleEntityAttachmentRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from entity_attachments where user_id = ${userId}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function make(overrides: Partial<EntityAttachmentEntity> = {}): EntityAttachmentEntity {
  return {
    id: randomUUID(),
    userId,
    entityType: "debt",
    entityId: randomUUID(),
    storageKey: `${userId}/${randomUUID()}.pdf`,
    fileName: "contrato.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("DrizzleEntityAttachmentRepository (integration)", () => {
  it("add + listForEntity retorna o anexo", async () => {
    const entityId = randomUUID();
    await repo.add(make({ entityId }));
    const list = await repo.listForEntity(userId, "debt", entityId);
    expect(list).toHaveLength(1);
    expect(list[0]!.fileName).toBe("contrato.pdf");
  });

  it("totalBytesForUser soma os tamanhos", async () => {
    await repo.add(make({ sizeBytes: 1000 }));
    await repo.add(make({ sizeBytes: 2500 }));
    expect(await repo.totalBytesForUser(userId)).toBe(3500);
  });

  it("totalBytesForUser retorna 0 sem anexos", async () => {
    expect(await repo.totalBytesForUser(userId)).toBe(0);
  });

  it("remove apaga só o anexo do dono", async () => {
    const a = make();
    await repo.add(a);
    await repo.remove(a.id, userId);
    expect(await repo.findById(a.id, userId)).toBeNull();
  });

  it("listAllForUser retorna todos os anexos do usuário ordenados", async () => {
    await repo.add(make({ entityType: "debt", fileName: "a.pdf" }));
    await repo.add(make({ entityType: "goal", fileName: "b.pdf" }));
    const all = await repo.listAllForUser(userId);
    expect(all.length).toBe(2);
  });
});
