import { describe, expect, it, vi } from "vitest";

import {
  listTransactionsByAccount,
  type ListTransactionsByAccountDeps,
} from "./list-transactions-by-account.use-case";

describe("listTransactionsByAccount", () => {
  it("delega ao repo com accountId e profileId", async () => {
    const deps: ListTransactionsByAccountDeps = {
      transactions: { listByAccount: vi.fn(async () => []) },
    };
    await listTransactionsByAccount(deps, { profileId: "profile-1", accountId: "acc1" });
    expect(deps.transactions.listByAccount).toHaveBeenCalledWith("acc1", "profile-1");
  });
});
