import { describe, expect, it } from "vitest";

import { syntheticId } from "./synthetic-id";

const base = {
  postedAt: new Date(Date.UTC(2026, 5, 5)),
  amountCents: 5000n,
  direction: "out" as const,
  memo: "Compra mercado",
};

describe("syntheticId", () => {
  it("is stable for the same input", () => {
    expect(syntheticId(base)).toBe(syntheticId({ ...base }));
  });

  it("is prefixed with syn:", () => {
    expect(syntheticId(base).startsWith("syn:")).toBe(true);
  });

  it("differs when amount, direction, day or memo differ", () => {
    expect(syntheticId(base)).not.toBe(syntheticId({ ...base, amountCents: 5001n }));
    expect(syntheticId(base)).not.toBe(syntheticId({ ...base, direction: "in" }));
    expect(syntheticId(base)).not.toBe(syntheticId({ ...base, postedAt: new Date(Date.UTC(2026, 5, 6)) }));
    expect(syntheticId(base)).not.toBe(syntheticId({ ...base, memo: "Outra coisa" }));
  });
});
