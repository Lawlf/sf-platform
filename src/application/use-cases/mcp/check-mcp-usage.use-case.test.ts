import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { checkAndIncrementMcpUsage } from "./check-mcp-usage.use-case";

const now = new Date("2026-06-03T12:00:00Z");

function deps(currentCount: number) {
  let count = currentCount;
  return {
    usage: {
      incrementAndGet: async () => {
        count += 1;
        return count;
      },
      getCount: async () => count,
    },
    clock: { now: () => now },
  };
}

describe("checkAndIncrementMcpUsage", () => {
  it("Pro nunca bloqueia e não conta", async () => {
    const d = deps(999);
    const r = await checkAndIncrementMcpUsage(d, { userId: "u1", isPro: true });
    expect(isOk(r)).toBe(true);
  });

  it("Free permite a 100ª chamada", async () => {
    const d = deps(99);
    const r = await checkAndIncrementMcpUsage(d, { userId: "u1", isPro: false });
    expect(isOk(r)).toBe(true);
  });

  it("Free bloqueia a 101ª chamada", async () => {
    const d = deps(100);
    const r = await checkAndIncrementMcpUsage(d, { userId: "u1", isPro: false });
    expect(isErr(r)).toBe(true);
  });
});
