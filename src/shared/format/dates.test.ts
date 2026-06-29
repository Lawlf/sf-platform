import { describe, expect, it } from "vitest";

import { todayIso } from "./dates";

describe("todayIso", () => {
  it("returns a yyyy-mm-dd string", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
