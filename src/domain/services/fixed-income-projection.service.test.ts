import { describe, expect, it } from "vitest";

import { projectFixedIncomeOneYear } from "./fixed-income-projection.service";

describe("projectFixedIncomeOneYear", () => {
  it("projeta 1 ano de valor parado à taxa informada", () => {
    const out = projectFixedIncomeOneYear(1_000_000n, 12);
    expect(out).not.toBeNull();
    expect(Number(out!)).toBeGreaterThan(1_119_000);
    expect(Number(out!)).toBeLessThan(1_121_000);
  });

  it("retorna null quando a taxa não é positiva", () => {
    expect(projectFixedIncomeOneYear(1_000_000n, 0)).toBeNull();
    expect(projectFixedIncomeOneYear(1_000_000n, -5)).toBeNull();
  });

  it("retorna null quando o valor não é positivo", () => {
    expect(projectFixedIncomeOneYear(0n, 12)).toBeNull();
  });
});
