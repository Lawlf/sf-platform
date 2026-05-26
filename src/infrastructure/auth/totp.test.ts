import { describe, expect, it } from "vitest";

import { base32Decode, base32Encode, generateTotpSecret, totpCodeAt, verifyTotp } from "./totp";

describe("base32", () => {
  it("round-trips bytes", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(Array.from(bytes));
  });
});

describe("totp", () => {
  // RFC 6238 SHA-1 vector: secret ASCII "12345678901234567890", T=59s -> 94287082
  const rfcSecret = base32Encode(new TextEncoder().encode("12345678901234567890"));

  it("matches the RFC 6238 test vector at T=59", async () => {
    expect(await totpCodeAt(rfcSecret, new Date(59 * 1000))).toBe("94287082".slice(-6));
  });

  it("verifies a code generated for the current step", async () => {
    const secret = generateTotpSecret();
    const now = new Date();
    const code = await totpCodeAt(secret, now);
    expect(await verifyTotp(secret, code, now)).toBe(true);
  });

  it("rejects a wrong code", async () => {
    const secret = generateTotpSecret();
    expect(await verifyTotp(secret, "000000", new Date())).toBe(false);
  });
});
