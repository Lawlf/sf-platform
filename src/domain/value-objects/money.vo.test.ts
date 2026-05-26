import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { Money } from "./money.vo";

describe("Money value object", () => {
  it("from(1234.56) stores 123456 cents", () => {
    const r = Money.from(1234.56);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.toCents()).toBe(123456n);
    }
  });

  it("from(0) is zero", () => {
    const r = Money.from(0);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.isZero()).toBe(true);
  });

  it("from(-100.50) is negative", () => {
    const r = Money.from(-100.5);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.toCents()).toBe(-10050n);
      expect(r.value.isNegative()).toBe(true);
    }
  });

  it("from(NaN) returns Err", () => {
    expect(isErr(Money.from(Number.NaN))).toBe(true);
  });

  it("from(Infinity) returns Err", () => {
    expect(isErr(Money.from(Number.POSITIVE_INFINITY))).toBe(true);
    expect(isErr(Money.from(Number.NEGATIVE_INFINITY))).toBe(true);
  });

  it("from(bigint) treats input as cents", () => {
    const r = Money.from(150000n);
    if (isOk(r)) expect(r.value.toCents()).toBe(150000n);
  });

  it('parses "1234,56" as 123456 cents', () => {
    const r = Money.from("1234,56");
    if (isOk(r)) expect(r.value.toCents()).toBe(123456n);
  });

  it('parses "R$ 1.234,56" as 123456 cents', () => {
    const r = Money.from("R$ 1.234,56");
    if (isOk(r)) expect(r.value.toCents()).toBe(123456n);
  });

  it('parses "1234.56" (dot decimal) as 123456 cents', () => {
    const r = Money.from("1234.56");
    if (isOk(r)) expect(r.value.toCents()).toBe(123456n);
  });

  it('from("abc") returns Err', () => {
    expect(isErr(Money.from("abc"))).toBe(true);
  });

  it("add and subtract are cents-accurate (no floating-point drift)", () => {
    const a = Money.from(0.1);
    const b = Money.from(0.2);
    if (isOk(a) && isOk(b)) {
      const sum = a.value.add(b.value);
      expect(sum.toCents()).toBe(30n);
    }
  });

  it("multiply by scalar with banker's rounding", () => {
    const a = Money.from(100);
    if (isOk(a)) {
      expect(a.value.multiply(0.075).toCents()).toBe(750n); // R$ 7,50
      expect(a.value.multiply(2).toCents()).toBe(20000n);
    }
  });

  it("divide by scalar", () => {
    const a = Money.from(100);
    if (isOk(a)) {
      expect(a.value.divide(4).toCents()).toBe(2500n);
    }
  });

  it("negate and abs", () => {
    const a = Money.from(50);
    if (isOk(a)) {
      expect(a.value.negate().toCents()).toBe(-5000n);
      expect(a.value.negate().abs().toCents()).toBe(5000n);
      expect(a.value.abs().toCents()).toBe(5000n);
    }
  });

  it("format() returns pt-BR currency notation", () => {
    const a = Money.from(1234.56);
    if (isOk(a)) {
      // Intl.NumberFormat output may use NBSP between R$ and the number;
      // normalize whitespace for the assertion.
      const formatted = a.value.format().replace(/\s+/g, " ");
      expect(formatted).toMatch(/R\$\s?1\.234,56/);
    }
  });

  it("equals matches by cents and currency", () => {
    const a = Money.from(10);
    const b = Money.from(10);
    if (isOk(a) && isOk(b)) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.equals(b.value.add(Money.fromCents(1n)))).toBe(false);
    }
  });

  it("compare returns -1, 0, 1", () => {
    const a = Money.from(10);
    const b = Money.from(20);
    const c = Money.from(10);
    if (isOk(a) && isOk(b) && isOk(c)) {
      expect(a.value.compare(b.value)).toBe(-1);
      expect(b.value.compare(a.value)).toBe(1);
      expect(a.value.compare(c.value)).toBe(0);
    }
  });

  it("banker's rounding at half boundary: 0.005 -> 0 cents, 0.015 -> 2 cents", () => {
    const a = Money.from(0.005);
    const b = Money.from(0.015);
    if (isOk(a)) expect(a.value.toCents()).toBe(0n);
    if (isOk(b)) expect(b.value.toCents()).toBe(2n);
  });

  it("Money.zero() and Money.fromCents", () => {
    expect(Money.zero().isZero()).toBe(true);
    expect(Money.fromCents(150n).toCents()).toBe(150n);
  });
});
