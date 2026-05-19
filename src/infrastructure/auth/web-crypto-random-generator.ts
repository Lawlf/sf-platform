import type { RandomGenerator } from "@/domain/ports/services/random-generator.service";

export class WebCryptoRandomGenerator implements RandomGenerator {
  bytes(length: number): Uint8Array {
    const out = new Uint8Array(length);
    crypto.getRandomValues(out);
    return out;
  }

  urlToken(): string {
    const raw = this.bytes(32);
    return Buffer.from(raw).toString("base64url");
  }

  sixDigitCode(): string {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const v = buf[0] as number;
    const n = v % 1_000_000;
    return n.toString().padStart(6, "0");
  }
}
