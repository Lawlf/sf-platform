import { describe, expect, it } from "vitest";

import { ADMIN_STEP_COOKIE, signElevation, verifyElevation } from "./admin-elevation";
import { signUserStepUp } from "./user-stepup";

const secret = "x".repeat(40);

describe("admin-elevation", () => {
  it("cookie name is sf_admin_step", () => {
    expect(ADMIN_STEP_COOKIE).toBe("sf_admin_step");
  });

  it("verifies a freshly signed token for the same admin", async () => {
    const token = await signElevation("admin-1", "totp", secret);
    const r = await verifyElevation(token, secret);
    expect(r?.adminId).toBe("admin-1");
    expect(r?.factor).toBe("totp");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signElevation("admin-1", "totp", secret);
    expect(await verifyElevation(token, "y".repeat(40))).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyElevation("not.a.jwt", secret)).toBeNull();
  });

  it("rejects a user step-up token even with the same secret (audience isolation)", async () => {
    const userToken = await signUserStepUp("admin-1", "totp", secret);
    expect(await verifyElevation(userToken, secret)).toBeNull();
  });
});
