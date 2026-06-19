import { describe, expect, it } from "vitest";

import type { HouseholdMemberEntity } from "@/domain/entities/household.entity";

import { hasAdmin, nextAdminAfterLeave } from "./household-membership.service";

function makeMember(
  userId: string,
  role: "admin" | "member",
  joinedAt = new Date("2026-01-01"),
): HouseholdMemberEntity {
  return { householdId: "h1", userId, role, joinedAt };
}

describe("hasAdmin", () => {
  it("returns true when at least one member is admin", () => {
    const members = [makeMember("u1", "admin"), makeMember("u2", "member")];
    expect(hasAdmin(members)).toBe(true);
  });

  it("returns false when no member is admin", () => {
    const members = [makeMember("u1", "member"), makeMember("u2", "member")];
    expect(hasAdmin(members)).toBe(false);
  });

  it("returns false for empty list", () => {
    expect(hasAdmin([])).toBe(false);
  });
});

describe("nextAdminAfterLeave", () => {
  it("member leaves while admin remains — no dissolve, no promote", () => {
    const members = [
      makeMember("admin1", "admin", new Date("2026-01-01")),
      makeMember("member1", "member", new Date("2026-01-02")),
    ];
    const result = nextAdminAfterLeave(members, "member1");
    expect(result).toEqual({ dissolve: false, promoteUserId: null });
  });

  it("sole admin leaves with remaining members — promotes oldest by joinedAt", () => {
    const members = [
      makeMember("admin1", "admin", new Date("2026-01-01")),
      makeMember("member2", "member", new Date("2026-01-03")),
      makeMember("member1", "member", new Date("2026-01-02")),
    ];
    const result = nextAdminAfterLeave(members, "admin1");
    expect(result).toEqual({ dissolve: false, promoteUserId: "member1" });
  });

  it("last member leaves — dissolve", () => {
    const members = [makeMember("u1", "admin", new Date("2026-01-01"))];
    const result = nextAdminAfterLeave(members, "u1");
    expect(result).toEqual({ dissolve: true, promoteUserId: null });
  });

  it("admin leaves but another admin remains — no promote", () => {
    const members = [
      makeMember("admin1", "admin", new Date("2026-01-01")),
      makeMember("admin2", "admin", new Date("2026-01-02")),
      makeMember("member1", "member", new Date("2026-01-03")),
    ];
    const result = nextAdminAfterLeave(members, "admin1");
    expect(result).toEqual({ dissolve: false, promoteUserId: null });
  });

  it("tie in joinedAt is broken deterministically by userId", () => {
    const tie = new Date("2026-02-01");
    const members = [
      makeMember("admin1", "admin", new Date("2026-01-01")),
      makeMember("z-user", "member", tie),
      makeMember("a-user", "member", tie),
    ];
    const result = nextAdminAfterLeave(members, "admin1");
    expect(result).toEqual({ dissolve: false, promoteUserId: "a-user" });
  });
});
