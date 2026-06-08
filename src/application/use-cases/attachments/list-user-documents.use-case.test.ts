import { describe, expect, it } from "vitest";

import type { EntityAttachmentEntity } from "@/domain/entities/entity-attachment.entity";

import { toUserDocuments } from "./list-user-documents.use-case";

function att(over: Partial<EntityAttachmentEntity> = {}): EntityAttachmentEntity {
  return {
    id: "a1", userId: "u1", entityType: "debt", entityId: "e1",
    storageKey: "u1/a1.pdf", fileName: "contrato.pdf", contentType: "application/pdf",
    sizeBytes: 1024, createdAt: new Date("2026-06-08T00:00:00Z"), ...over,
  };
}

describe("toUserDocuments", () => {
  it("resolve o label da entidade-pai", () => {
    const docs = toUserDocuments([att()], (t, id) => (t === "debt" && id === "e1" ? "Financiamento do carro" : null));
    expect(docs[0]!.parentLabel).toBe("Financiamento do carro");
    expect(docs[0]!.fileName).toBe("contrato.pdf");
    expect(docs[0]!.createdAtIso).toBe("2026-06-08T00:00:00.000Z");
  });

  it("usa fallback quando não acha o label", () => {
    const docs = toUserDocuments([att({ entityId: "missing" })], () => null);
    expect(docs[0]!.parentLabel).toBe("Sem vínculo");
  });
});
