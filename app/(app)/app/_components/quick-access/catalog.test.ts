import { describe, expect, it } from "vitest";

import { DEFAULT_QUICK_ACCESS } from "@/domain/services/quick-access.service";

import { CATALOG_KEYS, QUICK_ACCESS_CATALOG, resolveQuickAccess } from "./catalog";
import { QUICK_ACCESS_ICONS } from "./icons";
describe("catalog", () => {
  it("CATALOG_KEYS lists the expected curated keys", () => {
    expect(CATALOG_KEYS).toEqual([
      "add_debt", "add_income", "add_asset", "add_transaction",
      "sim_quitacao", "sim_extra", "sim_estrategia", "sim_compra", "sim_regra_de_tres", "sim_hub",
      "metas", "timeline", "dividas", "renda", "patrimonio", "comprei", "notificacoes",
      "documentos",
    ]);
  });
  it("every catalog icon name exists in the icon map", () => {
    for (const e of QUICK_ACCESS_CATALOG) {
      expect(QUICK_ACCESS_ICONS[e.icon], `missing icon: ${e.icon}`).toBeDefined();
    }
  });
  it("includes the three default add actions", () => { for (const k of DEFAULT_QUICK_ACCESS) expect(CATALOG_KEYS).toContain(k); });
  it("every entry has a label, shortLabel, href, category and icon", () => {
    for (const e of QUICK_ACCESS_CATALOG) {
      expect(e.label.length).toBeGreaterThan(0);
      expect(e.shortLabel.length).toBeGreaterThan(0);
      expect(e.href.startsWith("/app")).toBe(true);
      expect(["adicionar","simular","navegar"]).toContain(e.category);
      expect(e.icon.length).toBeGreaterThan(0);
    }
  });
});
describe("resolveQuickAccess", () => {
  it("falls back to the default set when keys are empty", () => { expect(resolveQuickAccess([]).map((e)=>e.key)).toEqual(DEFAULT_QUICK_ACCESS); });
  it("falls back to default when all keys are unknown", () => { expect(resolveQuickAccess(["nope","bad"]).map((e)=>e.key)).toEqual(DEFAULT_QUICK_ACCESS); });
  it("resolves valid keys to entries, preserving order", () => {
    const out = resolveQuickAccess(["add_income","timeline"]);
    expect(out.map((e)=>e.key)).toEqual(["add_income","timeline"]);
    expect(out[0]?.shortLabel).toBe("Renda");
  });
});
