import { describe, expect, it, vi } from "vitest";

import type { EntityAttachmentRepository } from "@/domain/ports/repositories/entity-attachment.repository";

import { buildStorageKey } from "./attachment-storage-key";
import { confirmAttachmentUpload } from "./confirm-attachment-upload.use-case";

const clock = { now: () => new Date("2026-06-08T00:00:00Z") };

function makeDeps(over: { isPro?: boolean } = {}) {
  const attachments: Pick<EntityAttachmentRepository, "add" | "totalBytesForUser"> = {
    add: vi.fn(),
    totalBytesForUser: vi.fn().mockResolvedValue(0),
  };
  return { attachments, clock, isPro: over.isPro ?? true };
}

const baseInput = {
  userId: "u1",
  attachmentId: "att-1",
  entityType: "debt" as const,
  entityId: "e1",
  fileName: "contrato.pdf",
  contentType: "application/pdf",
  sizeBytes: 1000,
};

describe("confirmAttachmentUpload", () => {
  it("nega para usuario nao Pro", async () => {
    const r = await confirmAttachmentUpload(makeDeps({ isPro: false }), {
      ...baseInput,
      storageKey: buildStorageKey(baseInput.userId, baseInput.attachmentId, baseInput.fileName),
    });
    expect(r).toEqual({ ok: false, message: "Recurso disponivel no Pro." });
  });

  it("nega storageKey com extensao diferente do fileName declarado", async () => {
    const deps = makeDeps();
    const r = await confirmAttachmentUpload(deps, {
      ...baseInput,
      storageKey: `${baseInput.userId}/att-1.jpg`,
      fileName: "contrato.pdf",
    });
    expect(r).toEqual({ ok: false, message: "Chave de arquivo inválida." });
  });

  it("nega storageKey fabricado com id de outro usuario", async () => {
    const deps = makeDeps();
    const r = await confirmAttachmentUpload(deps, {
      ...baseInput,
      storageKey: "outro-user/att-1.pdf",
    });
    expect(r).toEqual({ ok: false, message: "Chave de arquivo inválida." });
  });

  it("aceita storageKey exata e persiste o registro", async () => {
    const deps = makeDeps();
    const storageKey = buildStorageKey(baseInput.userId, baseInput.attachmentId, baseInput.fileName);
    const r = await confirmAttachmentUpload(deps, { ...baseInput, storageKey });
    expect(r).toEqual({ ok: true });
    expect(deps.attachments.add).toHaveBeenCalledOnce();
    expect(deps.attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({ storageKey, id: baseInput.attachmentId }),
    );
  });
});
