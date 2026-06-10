import { and, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";
import { exchangeRates } from "../schema/exchange-rates.schema";

import { ExchangeRateRepository } from "./exchange-rate.repository";

const TEST_SOURCE = "it-test-exchange-rate-source";

const repo = new ExchangeRateRepository();

beforeAll(() => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
});

afterEach(async () => {
  await getDb().execute(sql`delete from exchange_rates where source = ${TEST_SOURCE}`);
});

afterAll(async () => {
  await closeDb();
});

describe("ExchangeRateRepository (integration)", () => {
  it("upsertDaily then findLatest returns the row", async () => {
    const asOf = new Date("2024-01-01T00:00:00Z");
    await repo.upsertDaily({
      fromCurrency: "USD",
      toCurrency: "BRL",
      rateDecimal: "5.1234",
      source: TEST_SOURCE,
      asOf,
    });

    const found = await repo.findLatest("USD", "BRL", new Date());
    expect(found).not.toBeNull();
    expect(found?.fromCurrency).toBe("USD");
    expect(found?.toCurrency).toBe("BRL");
    expect(found?.rateDecimal).toBe("5.1234");
    expect(found?.source).toBe(TEST_SOURCE);
  });

  it("a second upsertDaily on the same pair/day/source updates rateDecimal", async () => {
    const asOf = new Date("2024-01-02T00:00:00Z");
    await repo.upsertDaily({
      fromCurrency: "USD",
      toCurrency: "BRL",
      rateDecimal: "5.0000",
      source: TEST_SOURCE,
      asOf,
    });
    await repo.upsertDaily({
      fromCurrency: "USD",
      toCurrency: "BRL",
      rateDecimal: "5.5000",
      source: TEST_SOURCE,
      asOf,
    });

    const dupes = await getDb()
      .select()
      .from(exchangeRates)
      .where(and(eq(exchangeRates.source, TEST_SOURCE), eq(exchangeRates.asOf, asOf)));
    expect(dupes).toHaveLength(1);

    const found = await repo.findLatest("USD", "BRL", new Date());
    expect(found?.rateDecimal).toBe("5.5000");
  });

  it("findLatest with an asOf before the row returns null", async () => {
    await repo.upsertDaily({
      fromCurrency: "USD",
      toCurrency: "BRL",
      rateDecimal: "5.1234",
      source: TEST_SOURCE,
      asOf: new Date("2024-06-01T00:00:00Z"),
    });

    const found = await repo.findLatest(
      "USD",
      "BRL",
      new Date("2024-01-01T00:00:00Z"),
    );
    expect(found).toBeNull();
  });
});
