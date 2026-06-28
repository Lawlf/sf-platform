import { describe, expect, it, vi } from "vitest";

import { isOk } from "@/shared/errors/result";

import { deleteAccount, DELETION_REASON } from "./delete-account.use-case";

function makeDeps() {
  const deactivate = vi.fn(async () => undefined);
  const deleteAllForUser = vi.fn(async () => undefined);

  return {
    deactivate,
    deleteAllForUser,
    users: { deactivate },
    sessions: { deleteAllForUser },
  };
}

describe("deleteAccount", () => {
  it("deactivates user with deletion reason and clears sessions", async () => {
    const { deactivate, deleteAllForUser, users, sessions } = makeDeps();

    const result = await deleteAccount({ users, sessions }, { userId: "u1" });

    expect(isOk(result)).toBe(true);
    expect(deleteAllForUser).toHaveBeenCalledWith("u1");
    expect(deactivate).toHaveBeenCalledWith("u1", DELETION_REASON);
  });

  it("clears sessions before deactivating (order matters)", async () => {
    const callOrder: string[] = [];
    const users = {
      deactivate: vi.fn(async () => { callOrder.push("deactivate"); }),
    };
    const sessions = {
      deleteAllForUser: vi.fn(async () => { callOrder.push("delete-sessions"); }),
    };

    await deleteAccount({ users, sessions }, { userId: "u1" });

    expect(callOrder).toEqual(["delete-sessions", "deactivate"]);
  });
});
