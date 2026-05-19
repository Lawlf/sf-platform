import { describe, it, expect } from "vitest";

import { Email } from "./email.vo";

describe("Email value object", () => {
  it("accepts a valid email", () => {
    const r = Email.from("USER@Example.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toString()).toBe("user@example.com");
  });

  it("rejects empty", () => {
    expect(Email.from("").ok).toBe(false);
  });

  it("rejects missing @", () => {
    expect(Email.from("no-at-sign").ok).toBe(false);
  });

  it("trims whitespace before validating", () => {
    const r = Email.from("  foo@bar.com  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toString()).toBe("foo@bar.com");
  });

  it("equality is by lowercase value", () => {
    const a = Email.from("X@y.com");
    const b = Email.from("x@Y.com");
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });
});
