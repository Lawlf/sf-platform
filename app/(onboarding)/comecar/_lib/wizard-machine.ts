import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";

export type WizardStepId =
  | "focus"
  | "income"
  | "debt"
  | "goal"
  | "asset"
  | "result-prescription"
  | "result-goal"
  | "result-networth";

const PATHS: Record<ContentDiagnosticAnswer, WizardStepId[]> = {
  "pagar-divida": ["focus", "income", "debt", "result-prescription"],
  guardar: ["focus", "income", "goal", "result-goal"],
  investir: ["focus", "income", "asset", "result-networth"],
};

export function stepsForFocus(focus: ContentDiagnosticAnswer | null): WizardStepId[] {
  if (focus === null) return ["focus"];
  return PATHS[focus];
}

export function nextStep(steps: WizardStepId[], current: WizardStepId): WizardStepId | null {
  const i = steps.indexOf(current);
  if (i === -1 || i === steps.length - 1) return null;
  return steps[i + 1] ?? null;
}

export function prevStep(steps: WizardStepId[], current: WizardStepId): WizardStepId | null {
  const i = steps.indexOf(current);
  if (i <= 0) return null;
  return steps[i - 1] ?? null;
}
