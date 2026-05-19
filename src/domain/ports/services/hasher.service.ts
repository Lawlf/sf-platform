export interface Hasher {
  sha256Hex(input: string | Uint8Array): Promise<string>;
}
