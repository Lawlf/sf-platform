import { describe, expect, it, vi } from "vitest";

import { purgeEntityAttachments } from "./purge-entity-attachments.use-case";

describe("purgeEntityAttachments", () => {
  it("apaga nota e cada anexo (storage + repo)", async () => {
    const notes = { deleteForEntity: vi.fn().mockResolvedValue(undefined) };
    const attachments = {
      listForEntity: vi
        .fn()
        .mockResolvedValue([
          { id: "a1", storageKey: "u1/a1.pdf" },
          { id: "a2", storageKey: "u1/a2.png" },
        ]),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const storage = { delete: vi.fn().mockResolvedValue(undefined) };

    await purgeEntityAttachments(
      { notes, attachments, storage },
      { userId: "u1", entityType: "debt", entityId: "e1" },
    );

    expect(notes.deleteForEntity).toHaveBeenCalledWith("u1", "debt", "e1");
    expect(storage.delete).toHaveBeenCalledTimes(2);
    expect(attachments.remove).toHaveBeenCalledTimes(2);
  });

  it("apaga a nota mesmo quando não há anexos", async () => {
    const notes = { deleteForEntity: vi.fn().mockResolvedValue(undefined) };
    const attachments = {
      listForEntity: vi.fn().mockResolvedValue([]),
      remove: vi.fn(),
    };
    const storage = { delete: vi.fn() };

    await purgeEntityAttachments(
      { notes, attachments, storage },
      { userId: "u1", entityType: "goal", entityId: "e1" },
    );

    expect(notes.deleteForEntity).toHaveBeenCalledWith("u1", "goal", "e1");
    expect(storage.delete).not.toHaveBeenCalled();
    expect(attachments.remove).not.toHaveBeenCalled();
  });
});
