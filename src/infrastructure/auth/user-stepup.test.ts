import { describe, expect, it } from "vitest";

import { signElevation } from "./admin-elevation";
import { signUserStepUp, verifyUserStepUp } from "./user-stepup";
const S = "secret-secret-secret-secret-secret-aa";
describe("user-stepup token", () => {
  it("round-trips userId + factor", async () => {
    const t = await signUserStepUp("u1", "pin", S);
    expect(await verifyUserStepUp(t, S)).toEqual({ userId: "u1", factor: "pin" });
  });
  it("rejects wrong secret", async () => {
    const t = await signUserStepUp("u1", "totp", S);
    expect(await verifyUserStepUp(t, "another-secret-another-secret-aaaa")).toBeNull();
  });
  it("rejects garbage", async () => { expect(await verifyUserStepUp("garbage", S)).toBeNull(); });
  it("rejects an admin elevation token even with the same secret (audience isolation)", async () => {
    const adminToken = await signElevation("u1", "totp", S);
    expect(await verifyUserStepUp(adminToken, S)).toBeNull();
  });
});
