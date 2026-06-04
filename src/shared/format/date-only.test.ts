import { describe, expect, it } from "vitest";

import { dateOnlyFormat } from "./date-only";

describe("dateOnlyFormat", () => {
  it("força timeZone UTC", () => {
    expect(dateOnlyFormat({ day: "2-digit" }).resolvedOptions().timeZone).toBe("UTC");
  });

  it("exibe o dia correto de uma data UTC, sem deslocar para o dia anterior", () => {
    const jan1 = new Date("2026-01-01T00:00:00Z");
    expect(dateOnlyFormat({ day: "2-digit", month: "2-digit" }).format(jan1)).toBe("01/01");
  });

  it("preserva opções e a localidade pt-BR", () => {
    const d = new Date("2026-06-30T00:00:00Z");
    const out = dateOnlyFormat({ day: "2-digit", weekday: "short" }).format(d);
    expect(out).toContain("30");
  });
});
