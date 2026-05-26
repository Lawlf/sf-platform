import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "./pin-hash";

describe("pin-hash", () => {
  it("verifies a correct pin", async () => { const s = await hashPin("1234"); expect(await verifyPin("1234", s)).toBe(true); });
  it("rejects a wrong pin", async () => { const s = await hashPin("1234"); expect(await verifyPin("9999", s)).toBe(false); });
  it("produces different hashes for the same pin (random salt)", async () => { expect(await hashPin("1234")).not.toBe(await hashPin("1234")); });
  it("returns false (never throws) for malformed stored values", async () => {
    for (const bad of ["", "bad", "pbkdf2$100000$$", "pbkdf2$abc$x$y", "x$y$z$w"]) {
      expect(await verifyPin("1234", bad)).toBe(false);
    }
  });
});
