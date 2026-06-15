import { describe, expect, it } from "vitest";

import {
  ATTACHABLE_ENTITY_TYPES,
  isAttachableEntityType,
} from "./attachable-entity-type";

describe("attachable entity type", () => {
  it("aceita os tipos macro válidos", () => {
    for (const t of ["debt", "debt_payment", "income", "goal", "account", "transaction"]) {
      expect(isAttachableEntityType(t)).toBe(true);
    }
  });

  it("rejeita tipo desconhecido", () => {
    expect(isAttachableEntityType("user")).toBe(false);
    expect(isAttachableEntityType("")).toBe(false);
  });

  it("expõe a lista canônica", () => {
    expect(ATTACHABLE_ENTITY_TYPES).toHaveLength(6);
  });
});
