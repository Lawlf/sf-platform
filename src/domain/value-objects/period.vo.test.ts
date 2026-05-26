import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { Period } from "./period.vo";

describe("Period", () => {
  it("from(jan, mar) ok and monthsBetween = 2", () => {
    const r = Period.from(new Date("2024-01-01"), new Date("2024-03-01"));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.monthsBetween()).toBe(2);
  });

  it("from(mar, jan) returns Err", () => {
    const r = Period.from(new Date("2024-03-01"), new Date("2024-01-01"));
    expect(isErr(r)).toBe(true);
  });

  it("open-ended monthsBetween(reference) computes against the argument", () => {
    const r = Period.from(new Date("2024-01-01"));
    if (isOk(r)) expect(r.value.monthsBetween(new Date("2024-07-01"))).toBe(6);
  });

  it("contains date inside range", () => {
    const r = Period.from(new Date("2024-01-01"), new Date("2024-03-31"));
    if (isOk(r)) {
      expect(r.value.contains(new Date("2024-02-15"))).toBe(true);
      expect(r.value.contains(new Date("2024-04-01"))).toBe(false);
    }
  });

  it("crossing year monthsBetween", () => {
    const r = Period.from(new Date("2023-11-01"), new Date("2024-02-01"));
    if (isOk(r)) expect(r.value.monthsBetween()).toBe(3);
  });

  it("same start and end -> 0 months", () => {
    const d = new Date("2024-01-01");
    const r = Period.from(d, d);
    if (isOk(r)) expect(r.value.monthsBetween()).toBe(0);
  });

  it("Invalid Date input rejected", () => {
    expect(isErr(Period.from(new Date("not-a-date")))).toBe(true);
  });

  it("daysBetween", () => {
    const r = Period.from(new Date("2024-01-01"), new Date("2024-01-11"));
    if (isOk(r)) expect(r.value.daysBetween()).toBe(10);
  });
});
