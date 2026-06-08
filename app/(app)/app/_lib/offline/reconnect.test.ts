import { describe, expect, it } from "vitest";

import { shouldAnnounceReconnect } from "./reconnect";

describe("shouldAnnounceReconnect", () => {
  it("anuncia quando volta de offline para online", () => {
    expect(shouldAnnounceReconnect(false, true)).toBe(true);
  });

  it("não anuncia quando já estava online", () => {
    expect(shouldAnnounceReconnect(true, true)).toBe(false);
  });

  it("não anuncia ao cair para offline", () => {
    expect(shouldAnnounceReconnect(true, false)).toBe(false);
  });

  it("não anuncia enquanto segue offline", () => {
    expect(shouldAnnounceReconnect(false, false)).toBe(false);
  });
});
