import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { color, gradient, radius, shadow } from "./tokens";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function cssVar(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`CSS var --${name} not found in globals.css`);
  return match[1]!.trim();
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

describe("tokens parity with globals.css", () => {
  it("brand ramp matches", () => {
    for (const [step, value] of Object.entries(color.brand)) {
      expect(cssVar(`color-brand-${step}`)).toBe(value);
    }
  });
  it("semantic colors match", () => {
    expect(cssVar("color-positive")).toBe(color.semantic.positive);
    expect(cssVar("color-negative")).toBe(color.semantic.negative);
    expect(cssVar("color-warning")).toBe(color.semantic.warning);
    expect(cssVar("color-info")).toBe(color.semantic.info);
  });
  it("radius matches", () => {
    expect(cssVar("radius-glass")).toBe(radius.glass);
    expect(cssVar("radius-card")).toBe(radius.card);
  });
  it("shadow matches", () => {
    expect(norm(cssVar("shadow-glass"))).toBe(norm(shadow.glass));
    expect(norm(cssVar("shadow-glass-strong"))).toBe(norm(shadow.glassStrong));
    expect(norm(cssVar("shadow-brand"))).toBe(norm(shadow.brand));
  });
  it("gradient vars match", () => {
    expect(norm(cssVar("gradient-brand"))).toBe(norm(gradient.brand));
    expect(norm(cssVar("gradient-brand-reversed"))).toBe(norm(gradient.brandReversed));
    expect(norm(cssVar("gradient-brand-deep"))).toBe(norm(gradient.brandDeep));
    expect(norm(cssVar("gradient-brand-soft"))).toBe(norm(gradient.brandSoft));
    expect(norm(cssVar("gradient-positive"))).toBe(norm(gradient.positive));
    expect(norm(cssVar("gradient-negative"))).toBe(norm(gradient.negative));
  });
});
