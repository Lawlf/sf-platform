const ITERATIONS = 100_000;

async function derive(pin: string, salt: Uint8Array, iterations: number, lenBits: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer, iterations, hash: "SHA-256" },
    key,
    lenBits,
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, ITERATIONS, 256);
  return `pbkdf2$${ITERATIONS}$${Buffer.from(salt).toString("base64")}$${Buffer.from(hash).toString("base64")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iters = Number(parts[1]);
  if (!Number.isInteger(iters) || iters < 1) return false;
  const salt = new Uint8Array(Buffer.from(parts[2]!, "base64"));
  const expected = new Uint8Array(Buffer.from(parts[3]!, "base64"));
  // Corrupt/empty segments would make deriveBits(0) throw; reject safely instead.
  if (salt.length === 0 || expected.length === 0) return false;
  const got = await derive(pin, salt, iters, expected.length * 8);
  return timingSafeEqual(got, expected);
}
