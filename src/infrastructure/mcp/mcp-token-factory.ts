import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";

export interface IssuedToken {
  raw: string;
  hash: string;
}

export async function issueOpaqueToken(): Promise<IssuedToken> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = Buffer.from(bytes).toString("base64url");
  const hash = await new WebCryptoHasher().sha256Hex(raw);
  return { raw, hash };
}
