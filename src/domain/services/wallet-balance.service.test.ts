import { describe, expect, it } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { type WalletEvent, WalletBalanceService } from "./wallet-balance.service";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture");
  return r.value;
}

const utc = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));

const inEvent = (date: Date, n: number): WalletEvent => ({ date, amount: moneyOf(n), direction: "in" });
const outEvent = (date: Date, n: number): WalletEvent => ({ date, amount: moneyOf(n), direction: "out" });

describe("WalletBalanceService.reactiveBalance", () => {
  it("anchor only, no events", () => {
    const bal = WalletBalanceService.reactiveBalance({
      anchorValue: moneyOf(500),
      anchorAt: utc(2026, 6, 1),
      asOf: utc(2026, 6, 4),
      events: [],
    });
    expect(bal.toNumber()).toBe(500);
  });

  it("income on day 5 is not counted on day 4", () => {
    const bal = WalletBalanceService.reactiveBalance({
      anchorValue: moneyOf(0),
      anchorAt: utc(2026, 6, 1),
      asOf: utc(2026, 6, 4),
      events: [inEvent(utc(2026, 6, 5), 5000)],
    });
    expect(bal.toNumber()).toBe(0);
  });

  it("income on day 5 is counted on day 6", () => {
    const bal = WalletBalanceService.reactiveBalance({
      anchorValue: moneyOf(0),
      anchorAt: utc(2026, 6, 1),
      asOf: utc(2026, 6, 6),
      events: [inEvent(utc(2026, 6, 5), 5000)],
    });
    expect(bal.toNumber()).toBe(5000);
  });

  it("settled debt (out) and ledger spend subtract", () => {
    const bal = WalletBalanceService.reactiveBalance({
      anchorValue: moneyOf(0),
      anchorAt: utc(2026, 6, 1),
      asOf: utc(2026, 6, 30),
      events: [inEvent(utc(2026, 6, 5), 5000), outEvent(utc(2026, 6, 10), 1200), outEvent(utc(2026, 6, 7), 40)],
    });
    expect(bal.toNumber()).toBe(3760);
  });

  it("events on or before the anchor are excluded", () => {
    const bal = WalletBalanceService.reactiveBalance({
      anchorValue: moneyOf(500),
      anchorAt: utc(2026, 6, 10),
      asOf: utc(2026, 6, 30),
      events: [inEvent(utc(2026, 6, 5), 9999), inEvent(utc(2026, 6, 10), 7777)],
    });
    expect(bal.toNumber()).toBe(500);
  });
});

describe("WalletBalanceService.monthEndProjection", () => {
  it("projects month close as positive", () => {
    const proj = WalletBalanceService.monthEndProjection({
      anchorValue: moneyOf(500),
      anchorAt: utc(2026, 6, 1),
      asOf: utc(2026, 6, 4),
      events: [],
      expectedEvents: [inEvent(utc(2026, 6, 5), 5000), outEvent(utc(2026, 6, 20), 1200)],
    });
    expect(proj.toNumber()).toBe(4300);
  });

  it("projects month close as negative", () => {
    const proj = WalletBalanceService.monthEndProjection({
      anchorValue: moneyOf(100),
      anchorAt: utc(2026, 6, 1),
      asOf: utc(2026, 6, 4),
      events: [],
      expectedEvents: [inEvent(utc(2026, 6, 5), 1000), outEvent(utc(2026, 6, 20), 1500)],
    });
    expect(proj.toNumber()).toBe(-400);
  });

  it("expected events past end of month are excluded", () => {
    const proj = WalletBalanceService.monthEndProjection({
      anchorValue: moneyOf(0),
      anchorAt: utc(2026, 6, 1),
      asOf: utc(2026, 6, 4),
      events: [],
      expectedEvents: [inEvent(utc(2026, 7, 5), 5000)],
    });
    expect(proj.toNumber()).toBe(0);
  });

  it("realized events still count inside a projection", () => {
    const proj = WalletBalanceService.monthEndProjection({
      anchorValue: moneyOf(0),
      anchorAt: utc(2026, 6, 1),
      asOf: utc(2026, 6, 10),
      events: [inEvent(utc(2026, 6, 5), 5000)],
      expectedEvents: [outEvent(utc(2026, 6, 20), 1200)],
    });
    expect(proj.toNumber()).toBe(3800);
  });
});
