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

  it("pagar-divida: focus, income, debt, result", () => {
    expect(stepsForFocus("pagar-divida")).toEqual(["focus", "income", "debt", "result-prescription"]);
  });

  it("guardar: focus, income, goal, result", () => {
    expect(stepsForFocus("guardar")).toEqual(["focus", "income", "goal", "result-goal"]);
  });

  it("investir: focus, income, asset, result", () => {
    expect(stepsForFocus("investir")).toEqual(["focus", "income", "asset", "result-networth"]);
  });

  it("nextStep advances along the focus path", () => {
    const steps = stepsForFocus("guardar");
    expect(nextStep(steps, "focus")).toBe("income");
    expect(nextStep(steps, "income")).toBe("goal");
    expect(nextStep(steps, "goal")).toBe("result-goal");
    expect(nextStep(steps, "result-goal")).toBeNull();
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
