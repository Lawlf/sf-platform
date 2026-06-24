import { describe, expect, it, vi } from "vitest";

import { isOk } from "@/shared/errors/result";

import { dismissChecklistItem } from "./dismiss-checklist-item.use-case";

describe("dismissChecklistItem", () => {
  it("marca a dispensa do item no repositório", async () => {
    const markChecklistItemDismissed = vi.fn().mockResolvedValue(undefined);
    const deps = { users: { markChecklistItemDismissed } } as unknown as Parameters<
      typeof dismissChecklistItem
    >[0];

    const result = await dismissChecklistItem(deps, { userId: "u1", item: "debt" });

    expect(isOk(result)).toBe(true);
    expect(markChecklistItemDismissed).toHaveBeenCalledWith("u1", "debt");
  });
});
