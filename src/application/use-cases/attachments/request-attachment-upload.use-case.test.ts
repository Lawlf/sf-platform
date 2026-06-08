import { describe, expect, it, vi } from "vitest";

import type { FileStoragePort } from "@/domain/ports/file-storage.port";
import type { EntityAttachmentRepository } from "@/domain/ports/repositories/entity-attachment.repository";

import { requestAttachmentUpload } from "./request-attachment-upload.use-case";

function makeDeps(over: { isPro?: boolean; total?: number } = {}) {
  const attachments: EntityAttachmentRepository = {
    add: vi.fn(),
    findById: vi.fn(),
    listForEntity: vi.fn(),
    remove: vi.fn(),
    totalBytesForUser: vi.fn().mockResolvedValue(over.total ?? 0),
  };
  const storage: FileStoragePort = {
    presignUpload: vi.fn().mockResolvedValue("https://r2/put"),
    presignDownload: vi.fn(),
    delete: vi.fn(),
  };
  return { attachments, storage, newId: () => "att-1", isPro: over.isPro ?? true };
}

describe("requestAttachmentUpload", () => {
  it("nega para usuario nao Pro", async () => {
    const r = await requestAttachmentUpload(makeDeps({ isPro: false }), {
      userId: "u1", entityType: "debt", entityId: "e1", fileName: "c.pdf", contentType: "application/pdf", sizeBytes: 1000,
    });
    expect(r).toEqual({ ok: false, reason: "not_pro" });
  });
  it("nega tipo invalido", async () => {
    const r = await requestAttachmentUpload(makeDeps(), {
      userId: "u1", entityType: "debt", entityId: "e1", fileName: "x.zip", contentType: "application/zip", sizeBytes: 1000,
    });
    expect(r).toEqual({ ok: false, reason: "type" });
  });
  it("retorna url assinada, storageKey e attachmentId quando valido", async () => {
    const r = await requestAttachmentUpload(makeDeps(), {
      userId: "u1", entityType: "debt", entityId: "e1", fileName: "contrato.pdf", contentType: "application/pdf", sizeBytes: 1000,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.uploadUrl).toBe("https://r2/put");
      expect(r.attachmentId).toBe("att-1");
      expect(r.storageKey).toMatch(/^u1\//);
    }
  });
});
