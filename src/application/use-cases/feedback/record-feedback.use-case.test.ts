import { describe, expect, it, vi } from "vitest";

import { recordFeedback, type RecordFeedbackDeps } from "./record-feedback.use-case";

function makeDeps() {
  const record = vi.fn().mockResolvedValue(undefined);
  const deps: RecordFeedbackDeps = {
    feedback: { record },
    clock: { now: () => new Date("2026-06-19T12:00:00Z") },
    newId: () => "fixed-id",
  };
  return { deps, record };
}

describe("recordFeedback", () => {
  it("records a thumbs-up with no comment", async () => {
    const { deps, record } = makeDeps();
    const res = await recordFeedback(deps, {
      userId: "u1",
      surface: "sim:juros-compostos",
      sentiment: "up",
    });
    expect(res.ok).toBe(true);
    expect(record).toHaveBeenCalledWith({
      id: "fixed-id",
      userId: "u1",
      surface: "sim:juros-compostos",
      sentiment: "up",
      comment: null,
      kind: null,
      attachmentKeys: [],
      createdAt: new Date("2026-06-19T12:00:00Z"),
    });
  });

  it("records a contact submission with kind and attachment", async () => {
    const { deps, record } = makeDeps();
    const res = await recordFeedback(deps, {
      userId: "u1",
      surface: "app:contato",
      kind: "problema",
      comment: "deu erro ao salvar",
      attachmentKeys: ["feedback/u1/abc.png", "feedback/u1/def.png"],
    });
    expect(res.ok).toBe(true);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "problema",
        attachmentKeys: ["feedback/u1/abc.png", "feedback/u1/def.png"],
      }),
    );
  });

  it("rejects an invalid kind", async () => {
    const { deps, record } = makeDeps();
    const res = await recordFeedback(deps, {
      userId: "u1",
      surface: "app:contato",
      kind: "spam",
      comment: "oi",
    });
    expect(res.ok).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });

  it("trims a comment and keeps it on thumbs-down", async () => {
    const { deps, record } = makeDeps();
    await recordFeedback(deps, {
      userId: "u1",
      surface: "sim:juros-compostos",
      sentiment: "down",
      comment: "  não entendi a taxa  ",
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ sentiment: "down", comment: "não entendi a taxa" }),
    );
  });

  it("stores an empty comment as null", async () => {
    const { deps, record } = makeDeps();
    await recordFeedback(deps, {
      userId: "u1",
      surface: "app:geral",
      sentiment: "down",
      comment: "   ",
    });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ comment: null }));
  });

  it("records a free suggestion with no sentiment", async () => {
    const { deps, record } = makeDeps();
    const res = await recordFeedback(deps, {
      userId: "u1",
      surface: "app:dropdown",
      comment: "podia ter modo escuro",
    });
    expect(res.ok).toBe(true);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ sentiment: null, comment: "podia ter modo escuro" }),
    );
  });

  it("rejects a suggestion with neither sentiment nor comment", async () => {
    const { deps, record } = makeDeps();
    const res = await recordFeedback(deps, { userId: "u1", surface: "app:dropdown" });
    expect(res.ok).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });

  it("rejects an invalid surface key", async () => {
    const { deps, record } = makeDeps();
    const res = await recordFeedback(deps, {
      userId: "u1",
      surface: "Sim Juros!!",
      sentiment: "up",
    });
    expect(res.ok).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });
});
