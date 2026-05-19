import { describe, it, expect } from "vitest";

import { DomainError } from "./domain-error";

class TestError extends DomainError {
  readonly code = "TEST_ERROR" as const;
}

describe("DomainError", () => {
  it("captures a code and message", () => {
    const err = new TestError("something went wrong");
    expect(err.code).toBe("TEST_ERROR");
    expect(err.message).toBe("something went wrong");
  });

  it("is an instance of Error", () => {
    const err = new TestError("boom");
    expect(err).toBeInstanceOf(Error);
  });

  it("preserves the name as the subclass name", () => {
    const err = new TestError("boom");
    expect(err.name).toBe("TestError");
  });

  it("accepts an optional cause", () => {
    const cause = new Error("root");
    const err = new TestError("wrapped", { cause });
    expect(err.cause).toBe(cause);
  });
});
