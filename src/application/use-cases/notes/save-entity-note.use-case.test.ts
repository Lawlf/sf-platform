import { describe, expect, it, vi } from "vitest";

import type { EntityNoteRepositoryPort } from "@/domain/ports/repositories/entity-note.repository";

import { saveEntityNote } from "./save-entity-note.use-case";

function makeRepo(): EntityNoteRepositoryPort {
  return {
    find: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue(undefined),
    deleteForEntity: vi.fn().mockResolvedValue(undefined),
  };
}

describe("saveEntityNote", () => {
  it("faz upsert da nota com corpo trimado", async () => {
    const notes = makeRepo();
    const r = await saveEntityNote(
      { notes, clock: { now: () => new Date("2026-06-08T00:00:00Z") }, newId: () => "id-1" },
      { userId: "u1", entityType: "debt", entityId: "e1", body: "  oi  " },
    );
    expect(r.ok).toBe(true);
    expect(notes.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ body: "oi", userId: "u1", entityType: "debt", entityId: "e1" }),
    );
  });

  it("apaga a nota quando o corpo fica vazio", async () => {
    const notes = makeRepo();
    await saveEntityNote(
      { notes, clock: { now: () => new Date() }, newId: () => "id-1" },
      { userId: "u1", entityType: "goal", entityId: "e1", body: "   " },
    );
    expect(notes.deleteForEntity).toHaveBeenCalledWith("u1", "goal", "e1");
    expect(notes.upsert).not.toHaveBeenCalled();
  });

  it("rejeita entityType inválido", async () => {
    const notes = makeRepo();
    const r = await saveEntityNote(
      { notes, clock: { now: () => new Date() }, newId: () => "id-1" },
      { userId: "u1", entityType: "bogus", entityId: "e1", body: "x" },
    );
    expect(r.ok).toBe(false);
  });
});
