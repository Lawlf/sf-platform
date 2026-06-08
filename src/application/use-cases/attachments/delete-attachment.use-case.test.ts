import { describe, expect, it, vi } from "vitest";

import { deleteAttachment } from "./delete-attachment.use-case";

describe("deleteAttachment", () => {
  it("apaga do storage e do repo quando existe e e do dono", async () => {
    const storage = { delete: vi.fn().mockResolvedValue(undefined) };
    const attachments = {
      findById: vi.fn().mockResolvedValue({ id: "a1", storageKey: "u1/a1.pdf" }),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const r = await deleteAttachment({ attachments, storage }, { userId: "u1", attachmentId: "a1" });
    expect(r.ok).toBe(true);
    expect(storage.delete).toHaveBeenCalledWith("u1/a1.pdf");
    expect(attachments.remove).toHaveBeenCalledWith("a1", "u1");
  });
  it("retorna erro quando nao encontra (ou nao e do dono)", async () => {
    const storage = { delete: vi.fn() };
    const attachments = { findById: vi.fn().mockResolvedValue(null), remove: vi.fn() };
    const r = await deleteAttachment({ attachments, storage }, { userId: "u1", attachmentId: "x" });
    expect(r.ok).toBe(false);
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
