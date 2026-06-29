import { describe, expect, it } from "vitest";

import { groupDuesByProximity } from "./due-buckets";

describe("groupDuesByProximity", () => {
  it("separa em hoje / esta semana / esse mês pelos limites de dias", () => {
    const buckets = groupDuesByProximity([
      { id: "a", daysUntil: 0 },
      { id: "b", daysUntil: 3 },
      { id: "c", daysUntil: 7 },
      { id: "d", daysUntil: 8 },
      { id: "e", daysUntil: 30 },
    ]);
    expect(buckets.map((b) => b.key)).toEqual(["today", "week", "month"]);
    expect(buckets[0]!.items.map((i) => i.id)).toEqual(["a"]);
    expect(buckets[1]!.items.map((i) => i.id)).toEqual(["b", "c"]);
    expect(buckets[2]!.items.map((i) => i.id)).toEqual(["d", "e"]);
  });

  it("trata vencido hoje ou negativo como 'hoje'", () => {
    const buckets = groupDuesByProximity([{ id: "x", daysUntil: -2 }]);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.key).toBe("today");
  });

  it("omite buckets vazios", () => {
    const buckets = groupDuesByProximity([{ id: "only", daysUntil: 12 }]);
    expect(buckets.map((b) => b.key)).toEqual(["month"]);
  });

  it("ordena por proximidade dentro do bucket", () => {
    const buckets = groupDuesByProximity([
      { id: "late", daysUntil: 6 },
      { id: "soon", daysUntil: 2 },
    ]);
    expect(buckets[0]!.items.map((i) => i.id)).toEqual(["soon", "late"]);
  });

  it("lista vazia gera nenhum bucket", () => {
    expect(groupDuesByProximity([])).toEqual([]);
  });
});
