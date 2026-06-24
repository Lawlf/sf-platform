import { describe, expect, it } from "vitest";
import { NOTIFICATION_KIND_CHANNELS } from "./notification-preferences.entity";

describe("NOTIFICATION_KIND_CHANNELS", () => {
  it("debtDue usa apenas push (email nunca foi implementado)", () => {
    expect(NOTIFICATION_KIND_CHANNELS.debtDueEnabled).toEqual(["push"]);
  });
});
