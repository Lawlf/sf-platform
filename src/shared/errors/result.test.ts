import { describe, it, expect } from "vitest";

import { DomainError } from "./domain-error";
import { ok, err, isOk, isErr, map, flatMap, unwrapOr } from "./result";

class FakeError extends DomainError {
  readonly code = "FAKE" as const;
}

describe("Result", () => {
  it("ok wraps a success value", () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (isOk(r)) {
      expect(r.value).toBe(42);
    }
  });

  it("err wraps a failure value", () => {
    const e = new FakeError("nope");
    const r = err(e);
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    if (isErr(r)) {
      expect(r.error).toBe(e);
    }
  });

  it("map transforms success values", () => {
    const r = map(ok(2), (n) => n * 3);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(6);
  });

  it("map preserves error", () => {
    const e = new FakeError("nope");
    const r = map(err<number, FakeError>(e), (n) => n * 3);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBe(e);
  });

  it("flatMap chains success", () => {
    const r = flatMap(ok(2), (n) => ok(n + 1));
    if (isOk(r)) expect(r.value).toBe(3);
    else throw new Error("expected ok");
  });

  it("flatMap short-circuits on error", () => {
    const e = new FakeError("first");
    const r = flatMap(err<number, FakeError>(e), (n) => ok(n + 1));
    if (isErr(r)) expect(r.error).toBe(e);
    else throw new Error("expected err");
  });

  it("unwrapOr returns value on ok", () => {
    expect(unwrapOr(ok(1), 99)).toBe(1);
  });

  it("unwrapOr returns fallback on err", () => {
    expect(unwrapOr(err(new FakeError("x")), 99)).toBe(99);
  });
});
