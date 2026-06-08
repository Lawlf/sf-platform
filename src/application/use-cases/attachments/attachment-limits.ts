export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const USER_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB

export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export type UploadRejectReason = "type" | "file_too_large" | "quota";

export type ValidateUploadResult = { ok: true } | { ok: false; reason: UploadRejectReason };

export function validateUpload(input: {
  contentType: string;
  sizeBytes: number;
  currentTotalBytes: number;
}): ValidateUploadResult {
  if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
    return { ok: false, reason: "type" };
  }
  if (input.sizeBytes > MAX_FILE_BYTES || input.sizeBytes <= 0) {
    return { ok: false, reason: "file_too_large" };
  }
  if (input.currentTotalBytes + input.sizeBytes > USER_QUOTA_BYTES) {
    return { ok: false, reason: "quota" };
  }
  return { ok: true };
}
