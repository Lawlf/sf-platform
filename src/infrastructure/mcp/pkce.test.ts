import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyPkceS256 } from "./pkce";

function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

describe("verifyPkceS256", () => {
  it("aceita verifier correto", () => {
    const verifier = "abc123abc123abc123abc123abc123abc123abc1";
    expect(verifyPkceS256(verifier, challengeFor(verifier))).toBe(true);
  });
  it("rejeita verifier errado", () => {
    expect(verifyPkceS256("errado", challengeFor("certo"))).toBe(false);
  });
});
