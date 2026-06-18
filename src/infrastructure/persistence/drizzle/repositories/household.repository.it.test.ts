import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { HouseholdRepository } from "./household.repository";
import { ProfileRepository } from "./profile.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL_A = "it-household-user-a@saborfinanceiro.com.br";
const TEST_EMAIL_B = "it-household-user-b@saborfinanceiro.com.br";

const users = new UserRepository();
const repo = new HouseholdRepository();
const profiles = new ProfileRepository();

let userAId: string;
let userBId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const a = await users.create({ email: TEST_EMAIL_A, emailVerified: true });
  userAId = a.id;
  const b = await users.create({ email: TEST_EMAIL_B, emailVerified: true });
  userBId = b.id;
});

afterEach(async () => {
  await getDb().execute(
    sql`delete from household_members where user_id in (${userAId}, ${userBId})`,
  );
  await getDb().execute(
    sql`delete from households where created_by_user_id in (${userAId}, ${userBId})`,
  );
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email in (${TEST_EMAIL_A}, ${TEST_EMAIL_B})`);
  await closeDb();
});

describe("HouseholdRepository (integration)", () => {
  it("createHousehold + addMember + listMembers", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();

    const household = await repo.createHousehold({
      id: householdId,
      name: "Familia Teste",
      createdByUserId: userAId,
      now,
    });

    expect(household.id).toBe(householdId);
    expect(household.name).toBe("Familia Teste");
    expect(household.createdByUserId).toBe(userAId);

    await repo.addMember({ householdId, userId: userAId, role: "admin", now });
    await repo.addMember({ householdId, userId: userBId, role: "member", now });

    const members = await repo.listMembers(householdId);
    expect(members).toHaveLength(2);
    const admin = members.find((m) => m.userId === userAId);
    const member = members.find((m) => m.userId === userBId);
    expect(admin?.role).toBe("admin");
    expect(member?.role).toBe("member");
  });

  it("findMembership returns correct role or null", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();
    await repo.createHousehold({ id: householdId, name: "Lar B", createdByUserId: userAId, now });
    await repo.addMember({ householdId, userId: userAId, role: "admin", now });

    const found = await repo.findMembership(householdId, userAId);
    expect(found?.role).toBe("admin");

    const missing = await repo.findMembership(householdId, userBId);
    expect(missing).toBeNull();
  });

  it("setRole updates member role", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();
    await repo.createHousehold({ id: householdId, name: "Lar C", createdByUserId: userAId, now });
    await repo.addMember({ householdId, userId: userBId, role: "member", now });

    await repo.setRole(householdId, userBId, "admin");

    const updated = await repo.findMembership(householdId, userBId);
    expect(updated?.role).toBe("admin");
  });

  it("createInvite + findInvite + setInviteStatus", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();
    await repo.createHousehold({ id: householdId, name: "Lar D", createdByUserId: userAId, now });
    await repo.addMember({ householdId, userId: userAId, role: "admin", now });

    const inviteId = crypto.randomUUID();
    const invite = await repo.createInvite({
      id: inviteId,
      householdId,
      invitedByUserId: userAId,
      inviteeRef: TEST_EMAIL_B,
      now,
    });

    expect(invite.id).toBe(inviteId);
    expect(invite.status).toBe("pending");
    expect(invite.respondedAt).toBeNull();

    const found = await repo.findInvite(inviteId);
    expect(found?.inviteeRef).toBe(TEST_EMAIL_B);

    const respondedAt = new Date();
    await repo.setInviteStatus(inviteId, "accepted", respondedAt);

    const updated = await repo.findInvite(inviteId);
    expect(updated?.status).toBe("accepted");
    expect(updated?.respondedAt).toBeInstanceOf(Date);
  });

  it("listPendingInvitesForRef returns only pending", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();
    await repo.createHousehold({ id: householdId, name: "Lar E", createdByUserId: userAId, now });
    await repo.addMember({ householdId, userId: userAId, role: "admin", now });

    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    await repo.createInvite({ id: id1, householdId, invitedByUserId: userAId, inviteeRef: "@testref", now });
    await repo.createInvite({ id: id2, householdId, invitedByUserId: userAId, inviteeRef: "@testref", now });
    await repo.setInviteStatus(id2, "declined", new Date());

    const pending = await repo.listPendingInvitesForRef("@testref");
    expect(pending.every((i) => i.status === "pending")).toBe(true);
    expect(pending.some((i) => i.id === id1)).toBe(true);
    expect(pending.some((i) => i.id === id2)).toBe(false);
  });

  it("listHouseholdsForUser returns households the user is a member of", async () => {
    const now = new Date();
    const h1 = crypto.randomUUID();
    const h2 = crypto.randomUUID();
    await repo.createHousehold({ id: h1, name: "Lar F", createdByUserId: userAId, now });
    await repo.createHousehold({ id: h2, name: "Lar G", createdByUserId: userAId, now });
    await repo.addMember({ householdId: h1, userId: userAId, role: "admin", now });
    await repo.addMember({ householdId: h2, userId: userAId, role: "admin", now });
    await repo.addMember({ householdId: h1, userId: userBId, role: "member", now });

    const forA = await repo.listHouseholdsForUser(userAId);
    expect(forA.length).toBeGreaterThanOrEqual(2);
    const ids = forA.map((h) => h.id);
    expect(ids).toContain(h1);
    expect(ids).toContain(h2);

    const forB = await repo.listHouseholdsForUser(userBId);
    const idsB = forB.map((h) => h.id);
    expect(idsB).toContain(h1);
    expect(idsB).not.toContain(h2);
  });

  it("findHousehold returns null for unknown id", async () => {
    const result = await repo.findHousehold(crypto.randomUUID());
    expect(result).toBeNull();
  });

  it("deleteHousehold cascades to members", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();
    await repo.createHousehold({ id: householdId, name: "Lar H", createdByUserId: userAId, now });
    await repo.addMember({ householdId, userId: userAId, role: "admin", now });

    await repo.deleteHousehold(householdId);

    const found = await repo.findHousehold(householdId);
    expect(found).toBeNull();

    const members = await repo.listMembers(householdId);
    expect(members).toHaveLength(0);
  });

  it("upsertSharedProfile (aggregate) → findSharedProfile returns the record", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();
    await repo.createHousehold({ id: householdId, name: "Lar I", createdByUserId: userAId, now });
    await repo.addMember({ householdId, userId: userAId, role: "admin", now });

    const profile = await profiles.ensurePfProfile(userAId, now);

    await repo.upsertSharedProfile({
      householdId,
      userId: userAId,
      profileId: profile.id,
      shareLevel: "aggregate",
      now,
    });

    const found = await repo.findSharedProfile(householdId, profile.id);
    expect(found).not.toBeNull();
    expect(found?.householdId).toBe(householdId);
    expect(found?.userId).toBe(userAId);
    expect(found?.profileId).toBe(profile.id);
    expect(found?.shareLevel).toBe("aggregate");
  });

  it("re-upsert with detail level updates shareLevel", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();
    await repo.createHousehold({ id: householdId, name: "Lar J", createdByUserId: userAId, now });
    await repo.addMember({ householdId, userId: userAId, role: "admin", now });

    const profile = await profiles.ensurePfProfile(userAId, now);

    await repo.upsertSharedProfile({
      householdId,
      userId: userAId,
      profileId: profile.id,
      shareLevel: "aggregate",
      now,
    });

    const later = new Date(now.getTime() + 1000);
    await repo.upsertSharedProfile({
      householdId,
      userId: userAId,
      profileId: profile.id,
      shareLevel: "detail",
      now: later,
    });

    const found = await repo.findSharedProfile(householdId, profile.id);
    expect(found?.shareLevel).toBe("detail");
  });

  it("listSharedProfilesForUser returns only the user's shares", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();
    await repo.createHousehold({ id: householdId, name: "Lar K", createdByUserId: userAId, now });
    await repo.addMember({ householdId, userId: userAId, role: "admin", now });
    await repo.addMember({ householdId, userId: userBId, role: "member", now });

    const profileA = await profiles.ensurePfProfile(userAId, now);
    const profileB = await profiles.ensurePfProfile(userBId, now);

    await repo.upsertSharedProfile({
      householdId,
      userId: userAId,
      profileId: profileA.id,
      shareLevel: "aggregate",
      now,
    });
    await repo.upsertSharedProfile({
      householdId,
      userId: userBId,
      profileId: profileB.id,
      shareLevel: "detail",
      now,
    });

    const sharesForA = await repo.listSharedProfilesForUser(householdId, userAId);
    expect(sharesForA).toHaveLength(1);
    expect(sharesForA[0]?.userId).toBe(userAId);

    const sharesForB = await repo.listSharedProfilesForUser(householdId, userBId);
    expect(sharesForB).toHaveLength(1);
    expect(sharesForB[0]?.userId).toBe(userBId);
  });

  it("removeSharedProfile deletes the record", async () => {
    const now = new Date();
    const householdId = crypto.randomUUID();
    await repo.createHousehold({ id: householdId, name: "Lar L", createdByUserId: userAId, now });
    await repo.addMember({ householdId, userId: userAId, role: "admin", now });

    const profile = await profiles.ensurePfProfile(userAId, now);

    await repo.upsertSharedProfile({
      householdId,
      userId: userAId,
      profileId: profile.id,
      shareLevel: "aggregate",
      now,
    });

    await repo.removeSharedProfile(householdId, profile.id);

    const found = await repo.findSharedProfile(householdId, profile.id);
    expect(found).toBeNull();
  });
});
