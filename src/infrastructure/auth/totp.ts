import { timingSafeStringEqual } from "./timing-safe-compare";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Random 20-byte secret, base32-encoded (standard TOTP length). */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

async function hmacSha1(key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength) as ArrayBuffer,
  );
  return new Uint8Array(sig);
}

function counterBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  return buf;
}

export async function totpCodeAt(secretBase32: string, when: Date): Promise<string> {
  const counter = Math.floor(when.getTime() / 1000 / STEP_SECONDS);
  const key = base32Decode(secretBase32);
  const hmac = await hmacSha1(key, counterBytes(counter));
  // SHA-1 HMAC is always 20 bytes; offset is masked to 0-15, so offset+3 <= 18.
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    hmac[offset + 3]!;
  return (bin % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/** Verifies a code allowing ±1 step of clock drift, constant-time per candidate. */
export async function verifyTotp(secretBase32: string, code: string, now: Date): Promise<boolean> {
  const trimmed = code.trim();
  for (const delta of [-1, 0, 1]) {
    const candidate = await totpCodeAt(
      secretBase32,
      new Date(now.getTime() + delta * STEP_SECONDS * 1000),
    );
    if (timingSafeStringEqual(candidate, trimmed)) return true;
  }
  return false;
}

/** otpauth:// URI for QR enrollment. */
export function totpAuthUri(
  secretBase32: string,
  account: string,
  issuer = "Sabor Financeiro",
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
