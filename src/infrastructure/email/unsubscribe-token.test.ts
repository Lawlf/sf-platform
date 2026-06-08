import { describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/config/env", () => ({
  loadEnv: () => ({ SESSION_COOKIE_SECRET: "0123456789012345678901234567890123" }),
}));

import {
  buildUnsubscribeHeaders,
  buildUnsubscribeUrl,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./unsubscribe-token";

describe("unsubscribe-token", () => {
  it("round-trips userId and category", () => {
    const token = createUnsubscribeToken("user-1", "monthly");
    expect(verifyUnsubscribeToken(token)).toEqual({ userId: "user-1", category: "monthly" });
  });

  it("rejects a tampered signature", () => {
    const token = createUnsubscribeToken("user-1", "promotions");
    const tampered = `${token}x`;
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it("rejects a swapped category (signature no longer matches)", () => {
    const token = createUnsubscribeToken("user-1", "monthly");
    const [userId, , sig] = token.split(".");
    const forged = `${userId}.promotions.${sig}`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyUnsubscribeToken("nope")).toBeNull();
    expect(verifyUnsubscribeToken("a.b")).toBeNull();
    expect(verifyUnsubscribeToken("a.bogus.c")).toBeNull();
  });

  it("builds an unsubscribe url with an encoded token", () => {
    const url = buildUnsubscribeUrl("https://app.test/", "user-1", "newsletter");
    expect(url).toContain("https://app.test/email/unsubscribe?token=");
    const token = decodeURIComponent(url.split("token=")[1] ?? "");
    expect(verifyUnsubscribeToken(token)).toEqual({ userId: "user-1", category: "newsletter" });
  });

  it("builds one-click List-Unsubscribe headers", () => {
    const headers = buildUnsubscribeHeaders("https://app.test", "user-1", "all");
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(headers["List-Unsubscribe"]).toMatch(/^<https:\/\/app\.test\/email\/unsubscribe\?token=.+>$/);
  });
});
