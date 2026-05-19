import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { DrizzleUserRepository } from "./drizzle-user.repository";

const repo = new DrizzleUserRepository();

beforeAll(() => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
});

afterEach(async () => {
  await getDb().execute(sql`delete from users where email like 'it-test-%@saborfinanceiro.com.br'`);
});

afterAll(async () => {
  await closeDb();
});

describe("DrizzleUserRepository (integration)", () => {
  it("creates and reads a user (find by id and find by email)", async () => {
    const created = await repo.create({
      email: "it-test-1@saborfinanceiro.com.br",
      emailVerified: true,
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.email).toBe("it-test-1@saborfinanceiro.com.br");
    expect(created.emailVerifiedAt).toBeInstanceOf(Date);
    expect(created.deactivatedAt).toBeNull();

    const byId = await repo.findById(created.id);
    expect(byId?.email).toBe("it-test-1@saborfinanceiro.com.br");

    const byEmail = await repo.findByEmail("IT-Test-1@saborfinanceiro.com.br");
    expect(byEmail?.id).toBe(created.id);
  });

  it("returns null when not found", async () => {
    expect(await repo.findByEmail("it-test-nobody@saborfinanceiro.com.br")).toBeNull();
    expect(await repo.findById("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("markEmailVerified sets a timestamp", async () => {
    const created = await repo.create({
      email: "it-test-verify@saborfinanceiro.com.br",
      emailVerified: false,
    });
    expect(created.emailVerifiedAt).toBeNull();
    await repo.markEmailVerified(created.id);
    const after = await repo.findById(created.id);
    expect(after?.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("deactivates a user without deleting", async () => {
    const created = await repo.create({
      email: "it-test-deactivate@saborfinanceiro.com.br",
      emailVerified: false,
    });
    await repo.deactivate(created.id, "user_request");
    const after = await repo.findById(created.id);
    expect(after?.deactivatedAt).toBeInstanceOf(Date);
    expect(after?.deactivationReason).toBe("user_request");
  });
});
