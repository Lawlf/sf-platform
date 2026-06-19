import { describe, expect, it } from "vitest";

import { makeT, pick } from "./types";

describe("pick", () => {
  it("returns a plain string unchanged regardless of ctx", () => {
    expect(pick("oi", "PF")).toBe("oi");
    expect(pick("oi", "PJ_MEI")).toBe("oi");
  });

  it("returns the ctx branch when present", () => {
    const v = { default: "Recebo todo mês", PJ_MEI: "Recebo do meu negócio" };
    expect(pick(v, "PJ_MEI")).toBe("Recebo do meu negócio");
  });

  it("falls back to default when the ctx branch is absent", () => {
    const v = { default: "Recebo todo mês", PJ_MEI: "Recebo do meu negócio" };
    expect(pick(v, "PF")).toBe("Recebo todo mês");
  });
});

describe("makeT", () => {
  const catalog = {
    "income.title": { default: "Recebo todo mês", PJ_MEI: "Recebo do meu negócio" },
    "income.desc": "fixo para todos",
  } as const;

  it("resolves keys against the PJ_MEI ctx", () => {
    const t = makeT(catalog, "PJ_MEI");
    expect(t("income.title")).toBe("Recebo do meu negócio");
    expect(t("income.desc")).toBe("fixo para todos");
  });

  it("resolves the default branch for PF", () => {
    const t = makeT(catalog, "PF");
    expect(t("income.title")).toBe("Recebo todo mês");
  });
});
