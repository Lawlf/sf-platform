import { describe, it, expect } from "vitest";

import { WebCryptoRandomGenerator } from "./web-crypto-random-generator";

describe("WebCryptoRandomGenerator", () => {
  const rng = new WebCryptoRandomGenerator();

  it("bytes(n) returns n bytes", () => {
    expect(rng.bytes(16)).toHaveLength(16);
    expect(rng.bytes(32)).toHaveLength(32);
  });

  it("bytes() returns different values across calls", () => {
    const a = rng.bytes(32);
    const b = rng.bytes(32);
    expect(Buffer.from(a).toString("hex")).not.toBe(Buffer.from(b).toString("hex"));
  });

  it("urlToken returns 43-char base64url string", () => {
    const t = rng.urlToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("sixDigitCode returns a 6-digit numeric string", () => {
    for (let i = 0; i < 100; i++) {
      const code = rng.sixDigitCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("sixDigitCode distribution: codes vary", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) codes.add(rng.sixDigitCode());
    expect(codes.size).toBeGreaterThan(40);
  });
});
