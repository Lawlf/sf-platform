import { describe, expect, it, vi } from "vitest";

import { isOk } from "@/shared/errors/result";

import { markWizardSeen } from "./mark-wizard-seen.use-case";

describe("markWizardSeen", () => {
  it("calls the repo to mark the wizard seen", async () => {
    const markOnboardingWizardSeen = vi.fn().mockResolvedValue(undefined);
    const users = {
      markOnboardingWizardSeen,
    } as unknown as Parameters<typeof markWizardSeen>[0]["users"];
    const result = await markWizardSeen({ users }, { userId: "u1" });
    expect(isOk(result)).toBe(true);
    expect(markOnboardingWizardSeen).toHaveBeenCalledWith("u1");
  });
});
