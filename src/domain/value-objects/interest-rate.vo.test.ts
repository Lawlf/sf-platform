import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { InterestRate } from "./interest-rate.vo";

describe("InterestRate", () => {
  it("fromAnnual(0.10).toMonthly() approx 0.007974", () => {
    const r = InterestRate.fromAnnual(0.1);
    if (isOk(r)) expect(r.value.toMonthly().toDecimal()).toBeCloseTo(0.007974, 6);
  });

  it("fromMonthly(0.01).toAnnual() approx 0.126825", () => {
    const r = InterestRate.fromMonthly(0.01);
    if (isOk(r)) expect(r.value.toAnnual().toDecimal()).toBeCloseTo(0.126825, 6);
  });

  it("round-trip annual -> monthly -> annual", () => {
    const r = InterestRate.fromAnnual(0.1);
    if (isOk(r)) expect(r.value.toMonthly().toAnnual().toDecimal()).toBeCloseTo(0.1, 9);
  });

  it("zero rate is allowed", () => {
    const r = InterestRate.fromAnnual(0);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.toMonthly().toDecimal()).toBe(0);
    }
  });

  it("rate at exactly -1 (or below) is rejected", () => {
    expect(isErr(InterestRate.fromMonthly(-1))).toBe(true);
    expect(isErr(InterestRate.fromMonthly(-1.5))).toBe(true);
  });

  it("infinite or NaN rate is rejected", () => {
    expect(isErr(InterestRate.fromMonthly(Number.POSITIVE_INFINITY))).toBe(true);
    expect(isErr(InterestRate.fromMonthly(Number.NaN))).toBe(true);
  });

  it("format monthly", () => {
    const r = InterestRate.fromMonthly(0.0083);
    if (isOk(r)) expect(r.value.format()).toMatch(/0,83\s?%\s?a\.m\./);
  });

  it("format annual", () => {
    const r = InterestRate.fromAnnual(0.1);
    if (isOk(r)) expect(r.value.format()).toMatch(/10,00\s?%\s?a\.a\./);
  });

  it("equals normalizes period before comparing", () => {
    const monthly = InterestRate.fromMonthly(0.007974);
    const annual = InterestRate.fromAnnual(0.1);
    if (isOk(monthly) && isOk(annual)) {
      expect(monthly.value.toMonthly().toDecimal()).toBeCloseTo(
        annual.value.toMonthly().toDecimal(),
        6,
      );
    }
  });
});
