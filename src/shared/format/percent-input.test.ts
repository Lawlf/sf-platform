import { describe, expect, it } from "vitest";

import { formatPercentDisplay, parsePercentInput } from "./percent-input";

describe("parsePercentInput", () => {
  it("parses a plain decimal", () => {
    expect(parsePercentInput("2.5")).toBe(2.5);
  });
  it("normalizes a comma decimal to a dot", () => {
    expect(parsePercentInput("2,5")).toBe(2.5);
  });
  it("empty string becomes zero", () => {
    expect(parsePercentInput("")).toBe(0);
  });
  it("rejects a non-finite entry with null", () => {
    expect(parsePercentInput("abc")).toBeNull();
  });
});

describe("formatPercentDisplay", () => {
  it("renders zero as empty", () => {
    expect(formatPercentDisplay(0)).toBe("");
  });
  it("stringifies a non-zero value", () => {
    expect(formatPercentDisplay(2.5)).toBe("2.5");
  });
});
