import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";

import { moneyFromRow, ownedBy } from "./helpers";
import { incomes } from "./schema/incomes.schema";

describe("ownedBy", () => {
  it("combina igualdade de userId com filtro de soft-delete", () => {
    const cond = ownedBy(incomes, "user-1");
    expect(cond).toEqual(and(eq(incomes.userId, "user-1"), isNull(incomes.deletedAt)));
  });
});

describe("moneyFromRow", () => {
  it("reconstrói Money a partir de cents e moeda", () => {
    const m = moneyFromRow(123456n, "BRL");
    expect(m.toCents()).toBe(123456n);
    expect(m.currency).toBe("BRL");
  });

  it("usa BRL como default", () => {
    expect(moneyFromRow(100n).currency).toBe("BRL");
  });

  it("aceita moeda nula de coluna legada caindo no default", () => {
    expect(moneyFromRow(100n, null).currency).toBe("BRL");
  });
});

describe("round-trip", () => {
  it("Money sobrevive ida e volta pela linha", () => {
    const m = Money.fromCents(987654321n, "USD");
    const back = moneyFromRow(m.toCents(), m.currency);
    expect(back.toCents()).toBe(m.toCents());
    expect(back.currency).toBe(m.currency);
  });
});
