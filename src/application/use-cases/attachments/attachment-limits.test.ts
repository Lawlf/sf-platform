import { describe, expect, it } from "vitest";

import {
  ALLOWED_CONTENT_TYPES,
  MAX_FILE_BYTES,
  USER_QUOTA_BYTES,
  validateUpload,
} from "./attachment-limits";

describe("validateUpload", () => {
  it("aceita pdf dentro dos limites", () => {
    const r = validateUpload({ contentType: "application/pdf", sizeBytes: 1_000_000, currentTotalBytes: 0 });
    expect(r.ok).toBe(true);
  });
  it("rejeita tipo não permitido", () => {
    const r = validateUpload({ contentType: "application/zip", sizeBytes: 100, currentTotalBytes: 0 });
    expect(r).toEqual({ ok: false, reason: "type" });
  });
  it("rejeita arquivo acima de 10 MB", () => {
    const r = validateUpload({ contentType: "image/png", sizeBytes: MAX_FILE_BYTES + 1, currentTotalBytes: 0 });
    expect(r).toEqual({ ok: false, reason: "file_too_large" });
  });
  it("rejeita quando estoura a cota do usuário", () => {
    const r = validateUpload({ contentType: "image/png", sizeBytes: 1000, currentTotalBytes: USER_QUOTA_BYTES });
    expect(r).toEqual({ ok: false, reason: "quota" });
  });
  it("expõe os content types permitidos incluindo heic", () => {
    expect(ALLOWED_CONTENT_TYPES).toContain("image/heic");
  });
});
