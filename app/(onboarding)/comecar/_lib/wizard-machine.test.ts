import { describe, expect, it } from "vitest";

import {
  stepsForFocus,
  nextStep,
  prevStep,
  type WizardStepId,
} from "./wizard-machine";

describe("wizard-machine", () => {
  it("focus step is first and has no focus yet", () => {
    expect(stepsForFocus(null)).toEqual(["focus"]);
  });

  it("pagar-divida: focus, income, debt, acquisition", () => {
    expect(stepsForFocus("pagar-divida")).toEqual(["focus", "income", "debt", "acquisition"]);
  });

  it("guardar: focus, income, goal, acquisition", () => {
    expect(stepsForFocus("guardar")).toEqual(["focus", "income", "goal", "acquisition"]);
  });

  it("investir: focus, income, asset, acquisition", () => {
    expect(stepsForFocus("investir")).toEqual(["focus", "income", "asset", "acquisition"]);
  });

  it("nextStep advances along the focus path, acquisition last", () => {
    const steps = stepsForFocus("guardar");
    expect(nextStep(steps, "focus")).toBe("income");
    expect(nextStep(steps, "income")).toBe("goal");
    expect(nextStep(steps, "goal")).toBe("acquisition");
    expect(nextStep(steps, "acquisition")).toBeNull();
  });

  it("prevStep goes back, null before first", () => {
    const steps = stepsForFocus("pagar-divida");
    expect(prevStep(steps, "debt")).toBe("income");
    expect(prevStep(steps, "focus")).toBeNull();
  });

  it("nextStep returns null for a step not in the list", () => {
    const steps = stepsForFocus("guardar");
    expect(nextStep(steps, "debt" as WizardStepId)).toBeNull();
  });
});
