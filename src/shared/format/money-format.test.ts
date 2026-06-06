import { describe, expect, it } from "vitest";

import { formatCents } from "./money-format";

describe("formatCents", () => {
  it("defaults to BRL", () => {
    expect(formatCents(123456n)).toContain("R$");
  });
  it("formats in the given currency", () => {
    expect(formatCents(123456n, "USD")).toContain("US$");
  });
  it("accepts number cents", () => {
    expect(formatCents(100)).toBe(formatCents(100n));
  });
  it("renders zero", () => {
    expect(formatCents(0n)).toContain("R$");
  });
});
