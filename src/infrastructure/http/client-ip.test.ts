import { describe, expect, it } from "vitest";

import { getClientIp } from "./client-ip";

function makeReq(headers: Record<string, string>): { headers: Headers } {
  return { headers: new Headers(headers) };
}

describe("getClientIp", () => {
  it("prefers x-real-ip when present", () => {
    const req = makeReq({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("falls back to last hop of x-forwarded-for", () => {
    const req = makeReq({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" });
    expect(getClientIp(req)).toBe("3.3.3.3");
  });

  it("returns null when no header", () => {
    expect(getClientIp(makeReq({}))).toBeNull();
  });

  it("ignores attacker-controlled first hops in XFF", () => {
    const req = makeReq({ "x-forwarded-for": "attacker, attacker, 10.0.0.1" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });
});
