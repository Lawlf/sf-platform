import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./secret-cipher";

const key = Buffer.alloc(32, 7); // deterministic 32-byte test key

describe("secret-cipher", () => {
  it("round-trips a secret", () => {
    const ct = encryptSecret("JBSWY3DPEHPK3PXP", key);
    expect(decryptSecret(ct, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("produces different ciphertext each call (random IV)", () => {
    expect(encryptSecret("same", key)).not.toBe(encryptSecret("same", key));
  });

  it("throws on tampered ciphertext", () => {
    const ct = encryptSecret("secret", key);
    const tampered = "AAAA" + ct.slice(4);
    expect(() => decryptSecret(tampered, key)).toThrow();
  });
});
