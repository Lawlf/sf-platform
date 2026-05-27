import { describe, expect, it } from "vitest";
import { DEFAULT_QUICK_ACCESS, MAX_QUICK_ACCESS, normalizeQuickAccess } from "./quick-access.service";
const ALLOWED = ["a","b","c","d","e","f","g","h","i","j"];
describe("normalizeQuickAccess", () => {
  it("keeps valid keys in order", () => { expect(normalizeQuickAccess(["b","a","c"], ALLOWED, MAX_QUICK_ACCESS)).toEqual(["b","a","c"]); });
  it("drops keys not in the allowed set", () => { expect(normalizeQuickAccess(["a","zzz","b"], ALLOWED, MAX_QUICK_ACCESS)).toEqual(["a","b"]); });
  it("dedupes, keeping the first occurrence", () => { expect(normalizeQuickAccess(["a","b","a"], ALLOWED, MAX_QUICK_ACCESS)).toEqual(["a","b"]); });
  it("caps at the max", () => { const r = normalizeQuickAccess(ALLOWED, ALLOWED, MAX_QUICK_ACCESS); expect(r).toHaveLength(MAX_QUICK_ACCESS); expect(r).toEqual(ALLOWED.slice(0, MAX_QUICK_ACCESS)); });
  it("returns empty for empty input", () => { expect(normalizeQuickAccess([], ALLOWED, MAX_QUICK_ACCESS)).toEqual([]); });
});
describe("constants", () => {
  it("MAX is 8 and default is the three add actions", () => { expect(MAX_QUICK_ACCESS).toBe(8); expect(DEFAULT_QUICK_ACCESS).toEqual(["add_debt","add_income","add_asset"]); });
});
