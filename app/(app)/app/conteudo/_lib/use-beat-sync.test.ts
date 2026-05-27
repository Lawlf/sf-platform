import { describe, expect, it } from "vitest";

import type { Beat } from "./beats";
import { activeBeatIndex, activeLineIndex } from "./use-beat-sync";

const beats: Beat[] = [
  { label: "A", durationSec: 10, lines: ["a1", "a2"], Visual: () => null },
  { label: "B", durationSec: 10, lines: ["b1", "b2"], Visual: () => null },
];

describe("activeBeatIndex", () => {
  it("t=0 -> beat 0", () => expect(activeBeatIndex(beats, 0)).toBe(0));
  it("t=9.9 -> beat 0", () => expect(activeBeatIndex(beats, 9.9)).toBe(0));
  it("t=10 -> beat 1", () => expect(activeBeatIndex(beats, 10)).toBe(1));
  it("t além do fim -> último beat", () => expect(activeBeatIndex(beats, 999)).toBe(1));
});

describe("activeLineIndex", () => {
  it("t=0 -> linha 0", () => expect(activeLineIndex(beats, 0)).toBe(0));
  it("t=5 -> linha 1 (segunda metade do beat 0)", () => expect(activeLineIndex(beats, 5)).toBe(1));
  it("t=10 -> linha 2 (primeira do beat 1)", () => expect(activeLineIndex(beats, 10)).toBe(2));
});
