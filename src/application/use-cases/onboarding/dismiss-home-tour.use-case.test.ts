import { describe, expect, it, vi } from "vitest";

import { isOk } from "@/shared/errors/result";

import { dismissHomeTour } from "./dismiss-home-tour.use-case";

describe("dismissHomeTour", () => {
  it("calls the repo to mark the tour dismissed", async () => {
    const markHomeTourDismissed = vi.fn().mockResolvedValue(undefined);
    const users = {
      markHomeTourDismissed,
    } as unknown as Parameters<typeof dismissHomeTour>[0]["users"];
    const result = await dismissHomeTour({ users }, { userId: "u1" });
    expect(isOk(result)).toBe(true);
    expect(markHomeTourDismissed).toHaveBeenCalledWith("u1");
  });
});
