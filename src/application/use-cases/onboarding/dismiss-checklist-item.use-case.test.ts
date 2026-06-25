import { describe, expect, it, vi } from "vitest";

import { isOk } from "@/shared/errors/result";

import { dismissChecklistItem } from "./dismiss-checklist-item.use-case";

describe("dismissChecklistItem", () => {
  it("marca a dispensa do item no perfil ativo", async () => {
    const markChecklistItemDismissed = vi.fn().mockResolvedValue(undefined);
    const deps = { profiles: { markChecklistItemDismissed } } as unknown as Parameters<
      typeof dismissChecklistItem
    >[0];

    const result = await dismissChecklistItem(deps, { profileId: "p1", item: "debt" });

    expect(isOk(result)).toBe(true);
    expect(markChecklistItemDismissed).toHaveBeenCalledWith("p1", "debt");
  });
});
