const MAX_BYTES = 200 * 1024;
const ALLOWED_MIME = new Set(["image/webp", "image/jpeg", "image/png"]);
const DATA_URL_RE = /^data:(image\/[a-z+]+);base64,([a-z0-9+/]+=*)$/i;

export type AvatarValidation = { ok: true; dataUrl: string } | { ok: false; message: string };

export function validateAvatarDataUrl(dataUrl: unknown): AvatarValidation {
  if (typeof dataUrl !== "string") return { ok: false, message: "Imagem inválida." };

  const match = DATA_URL_RE.exec(dataUrl);
  const mime = match?.[1];
  const base64 = match?.[2];
  if (!mime || !base64) return { ok: false, message: "Formato de imagem inválido." };

  if (!ALLOWED_MIME.has(mime.toLowerCase())) {
    return { ok: false, message: "Use uma imagem JPEG, PNG ou WebP." };
  }

  const bytes = Buffer.from(base64, "base64").length;
  if (bytes > MAX_BYTES) {
    return { ok: false, message: "Imagem muito grande. Tente uma foto menor." };
  }

  return { ok: true, dataUrl };
}
