import { describe, expect, it } from "vitest";

import type { Prescription, PrescriptionMove } from "@/domain/services/prescription/prescription.types";

import { suggestContent } from "./content-suggestion";

function move(type: PrescriptionMove["type"], label?: string): PrescriptionMove {
  return {
    type,
    reasonCode: "highest_rate",
    ...(label !== undefined ? { targetDebtLabel: label } : {}),
    metrics: {},
    rankImpactReais: 0,
  };
}

function presc(state: Prescription["state"], dominant: PrescriptionMove | null): Prescription {
  return { state, dominant, alternatives: [], timeline: [], completeness: { complete: true, missing: [] } };
}

describe("suggestContent", () => {
  it("bleeding + pay_debt -> sair-do-vermelho módulo 2, pronto, com label", () => {
    const s = suggestContent(presc("bleeding", move("pay_debt", "Nubank")));
    expect(s).toEqual({
      trilhaSlug: "sair-do-vermelho",
      moduleNum: 2,
      ready: true,
      contextLabels: { targetDebtLabel: "Nubank" },
    });
  });

  it("tight + reduce_commitment -> sair-do-vermelho módulo 1", () => {
    const s = suggestContent(presc("tight", move("reduce_commitment")));
    expect(s?.trilhaSlug).toBe("sair-do-vermelho");
    expect(s?.moduleNum).toBe(1);
    expect(s?.ready).toBe(true);
  });

  it("no_cushion -> sobrar-e-fazer-render, em breve (ready false)", () => {
    const s = suggestContent(presc("no_cushion", move("build_reserve")));
    expect(s?.trilhaSlug).toBe("sobrar-e-fazer-render");
    expect(s?.ready).toBe(false);
  });

  it("ready_to_grow -> compor-patrimonio, em breve", () => {
    const s = suggestContent(presc("ready_to_grow", move("invest")));
    expect(s?.trilhaSlug).toBe("compor-patrimonio");
    expect(s?.ready).toBe(false);
  });

  it("incomplete ou null -> sem sugestão", () => {
    expect(suggestContent(presc("incomplete", null))).toBeNull();
    expect(suggestContent(null)).toBeNull();
  });
});
