import { describe, expect, it } from "vitest";

import type { DebtDueAcknowledgementEntity } from "@/domain/entities/debt-due-acknowledgement.entity";
import type { DebtDueAcknowledgementRow } from "../schema/debt-due-acknowledgements.schema";

function rowToEntity(row: DebtDueAcknowledgementRow): DebtDueAcknowledgementEntity {
  return {
    id: row.id,
    userId: row.userId,
    debtId: row.debtId,
    cycleIso: row.cycleIso,
    response: row.response as DebtDueAcknowledgementEntity["response"],
    respondedAt: row.respondedAt,
    createdAt: row.createdAt,
  };
}

describe("DebtDueAcknowledgementRepository row<->entity mapping", () => {
  const respondedAt = new Date("2026-06-01T10:00:00Z");
  const createdAt = new Date("2026-06-01T10:00:00Z");

  const row: DebtDueAcknowledgementRow = {
    id: "aaaa0000-0000-0000-0000-000000000001",
    userId: "bbbb0000-0000-0000-0000-000000000002",
    debtId: "cccc0000-0000-0000-0000-000000000003",
    cycleIso: "2026-06",
    response: "paid",
    respondedAt,
    createdAt,
  };

  it("maps all fields from row to entity", () => {
    const entity = rowToEntity(row);

    expect(entity.id).toBe(row.id);
    expect(entity.userId).toBe(row.userId);
    expect(entity.debtId).toBe(row.debtId);
    expect(entity.cycleIso).toBe("2026-06");
    expect(entity.response).toBe("paid");
    expect(entity.respondedAt).toBe(respondedAt);
    expect(entity.createdAt).toBe(createdAt);
  });

  it("preserves deferred response", () => {
    const entity = rowToEntity({ ...row, response: "deferred" });
    expect(entity.response).toBe("deferred");
  });

  it("preserves written_off response", () => {
    const entity = rowToEntity({ ...row, response: "written_off" });
    expect(entity.response).toBe("written_off");
  });
});
