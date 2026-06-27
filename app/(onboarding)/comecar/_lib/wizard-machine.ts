import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";

export type WizardStepId =
  | "focus"
  | "income"
  | "debt"
  | "expense"
  | "goal"
  | "asset"
  | "result-prescription"
  | "result-goal"
  | "result-networth"
  | "result-month-closing"
  | "acquisition";

const PATHS: Record<ContentDiagnosticAnswer, WizardStepId[]> = {
  "pagar-divida": ["focus", "income", "debt", "result-prescription", "acquisition"],
  guardar: ["focus", "income", "goal", "result-goal", "acquisition"],
  investir: ["focus", "income", "asset", "result-networth", "acquisition"],
  "fechar-mes": ["focus", "income", "expense", "result-month-closing", "acquisition"],
};

export const WIZARD_TOTAL_STEPS = Math.max(...Object.values(PATHS).map((p) => p.length));

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
