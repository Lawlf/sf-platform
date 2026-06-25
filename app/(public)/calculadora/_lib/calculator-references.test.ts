import { describe, expect, it } from "vitest";

import { getCalculatorReference } from "./calculator-references";
import { PUBLIC_CALCULATORS } from "./public-calculators";

describe("calculator references", () => {
  it("every public calculator has a reference entry", () => {
    const missing = PUBLIC_CALCULATORS.filter((c) => !getCalculatorReference(c.simId)).map(
      (c) => c.simId,
    );
    expect(missing).toEqual([]);
  });

  it("legal references carry a year; formula references do not", () => {
    for (const c of PUBLIC_CALCULATORS) {
      const ref = getCalculatorReference(c.simId)!;
      if (ref.legal) expect(ref.year).toBeTruthy();
      else expect(ref.year).toBeNull();
    }
  });
});
