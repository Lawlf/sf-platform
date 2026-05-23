import { describe, expect, it, vi } from "vitest";

import { deactivateAccount } from "./deactivate-account.use-case";

type Deps = Parameters<typeof deactivateAccount>[0];

function makeDeps(): Deps {
  const users = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    deactivate: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    findAllPro: vi.fn().mockResolvedValue([]),
  };
  const sessions = {
    findByIdHash: vi.fn(),
    findWithUserByIdHash: vi.fn(),
    listActiveForUser: vi.fn(),
    create: vi.fn(),
    touch: vi.fn(),
    delete: vi.fn(),
    deleteAllForUser: vi.fn().mockResolvedValue(undefined),
  };
  return { users, sessions } as Deps;
}

describe("deactivateAccount", () => {
  it("calls users.deactivate then sessions.deleteAllForUser with the right args", async () => {
    const deps = makeDeps();
    const result = await deactivateAccount(deps, {
      userId: "user-1",
      reason: "no longer needed",
    });

    expect(result._tag).toBe("ok");
    expect(deps.users.deactivate).toHaveBeenCalledTimes(1);
    expect(deps.users.deactivate).toHaveBeenCalledWith("user-1", "no longer needed");
    expect(deps.sessions.deleteAllForUser).toHaveBeenCalledTimes(1);
    expect(deps.sessions.deleteAllForUser).toHaveBeenCalledWith("user-1");

    const deactivateOrders = (deps.users.deactivate as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder;
    const deleteAllOrders = (deps.sessions.deleteAllForUser as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder;
    expect(deactivateOrders.length).toBeGreaterThan(0);
    expect(deleteAllOrders.length).toBeGreaterThan(0);
    expect(deactivateOrders[0]!).toBeLessThan(deleteAllOrders[0]!);
  });

  it("accepts a null reason", async () => {
    const deps = makeDeps();
    const result = await deactivateAccount(deps, { userId: "user-2", reason: null });

    expect(result._tag).toBe("ok");
    expect(deps.users.deactivate).toHaveBeenCalledWith("user-2", null);
    expect(deps.sessions.deleteAllForUser).toHaveBeenCalledWith("user-2");
  });
});
