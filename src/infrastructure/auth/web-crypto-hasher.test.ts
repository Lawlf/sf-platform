import { describe, it, expect } from "vitest";

import { WebCryptoHasher } from "./web-crypto-hasher";

describe("WebCryptoHasher", () => {
  const hasher = new WebCryptoHasher();

  it("sha256 of empty string is e3b0c442...", async () => {
    expect(await hasher.sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("sha256 of 'abc'", async () => {
    expect(await hasher.sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("sha256 of bytes equals sha256 of equivalent string", async () => {
    const bytes = new TextEncoder().encode("hello");
    const fromBytes = await hasher.sha256Hex(bytes);
    const fromString = await hasher.sha256Hex("hello");
    expect(fromBytes).toBe(fromString);
  });
});
