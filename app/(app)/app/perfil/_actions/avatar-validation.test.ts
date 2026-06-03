import { describe, expect, it } from "vitest";

import { validateAvatarDataUrl } from "./avatar-validation";

const tinyJpeg = `data:image/jpeg;base64,${Buffer.from("hello").toString("base64")}`;

describe("validateAvatarDataUrl", () => {
  it("rejects non-string input", () => {
    const result = validateAvatarDataUrl(null);
    expect(result.ok).toBe(false);
  });

  it("rejects a string that is not a data URL", () => {
    const result = validateAvatarDataUrl("not-an-image");
    expect(result.ok).toBe(false);
  });

  it("rejects a disallowed image mime", () => {
    const gif = `data:image/gif;base64,${Buffer.from("x").toString("base64")}`;
    const result = validateAvatarDataUrl(gif);
    expect(result).toEqual({ ok: false, message: "Use uma imagem JPEG, PNG ou WebP." });
  });

  it("rejects a payload larger than the byte cap", () => {
    const oversized = `data:image/webp;base64,${Buffer.alloc(200 * 1024 + 1, 1).toString("base64")}`;
    const result = validateAvatarDataUrl(oversized);
    expect(result).toEqual({ ok: false, message: "Imagem muito grande. Tente uma foto menor." });
  });

  it("accepts a valid jpeg data URL", () => {
    const result = validateAvatarDataUrl(tinyJpeg);
    expect(result).toEqual({ ok: true, dataUrl: tinyJpeg });
  });

  it("accepts webp and png mimes", () => {
    const webp = `data:image/webp;base64,${Buffer.from("a").toString("base64")}`;
    const png = `data:image/png;base64,${Buffer.from("b").toString("base64")}`;
    expect(validateAvatarDataUrl(webp).ok).toBe(true);
    expect(validateAvatarDataUrl(png).ok).toBe(true);
  });
});
