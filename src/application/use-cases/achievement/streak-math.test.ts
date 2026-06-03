import { describe, expect, it } from "vitest";

import { longestConsecutiveMonths, totalDistinctMonths } from "./streak-math";

describe("streak-math", () => {
  it("totalDistinctMonths conta meses únicos", () => {
    expect(totalDistinctMonths(["2026-01", "2026-01", "2026-03"])).toBe(2);
    expect(totalDistinctMonths([])).toBe(0);
  });

  it("longestConsecutiveMonths acha a maior sequência", () => {
    expect(longestConsecutiveMonths(["2026-01", "2026-02", "2026-03"])).toBe(3);
  });

  it("longestConsecutiveMonths reinicia no buraco", () => {
    expect(longestConsecutiveMonths(["2026-01", "2026-02", "2026-05", "2026-06"])).toBe(2);
  });

  it("longestConsecutiveMonths cruza virada de ano", () => {
    expect(longestConsecutiveMonths(["2025-11", "2025-12", "2026-01"])).toBe(3);
  });

  it("vazio retorna 0", () => {
    expect(longestConsecutiveMonths([])).toBe(0);
  });
});
