import { getTableName } from "drizzle-orm";
import { describe, it, expect } from "vitest";

import { users, sessions, magicLinkTokens, oauthAccounts } from "./index";

describe("drizzle schema", () => {
  it("declares users table", () => {
    expect(getTableName(users)).toBe("users");
  });

  it("declares sessions table", () => {
    expect(getTableName(sessions)).toBe("sessions");
  });

  it("declares magic_link_tokens table", () => {
    expect(getTableName(magicLinkTokens)).toBe("magic_link_tokens");
  });

  it("declares oauth_accounts table", () => {
    expect(getTableName(oauthAccounts)).toBe("oauth_accounts");
  });

  it("users table has expected columns", () => {
    const cols = Object.keys(users);
    for (const col of [
      "id",
      "email",
      "emailVerifiedAt",
      "displayName",
      "role",
      "plan",
      "isPro",
      "deactivatedAt",
      "deactivationReason",
      "createdAt",
      "updatedAt",
    ]) {
      expect(cols).toContain(col);
    }
  });
});
