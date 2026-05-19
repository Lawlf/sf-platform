import type { Hasher } from "@/domain/ports/services/hasher.service";

export class WebCryptoHasher implements Hasher {
  async sha256Hex(input: string | Uint8Array): Promise<string> {
    const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}
