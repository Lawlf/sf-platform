"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { markWizardSeenAction } from "@/app/(app)/app/_actions/onboarding";
import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";

import {
  stepsForFocus,
  nextStep,
  prevStep,
  type WizardStepId,
} from "../_lib/wizard-machine";
import { FocusStep } from "./steps/focus-step.client";
import { IncomeStep } from "./steps/income-step.client";

export function OnboardingWizardClient({
  initialFocus,
}: {
  initialFocus: ContentDiagnosticAnswer | null;
}) {
  const router = useRouter();
  const [focus, setFocus] = useState<ContentDiagnosticAnswer | null>(initialFocus);
  const [current, setCurrent] = useState<WizardStepId>("focus");
  const [finishing, startFinish] = useTransition();

  const steps = useMemo(() => stepsForFocus(focus), [focus]);
  const stepNumber = (Math.max(0, steps.indexOf(current)) + 1) as WizardStep;

  function finishWizard() {
    startFinish(async () => {
      await markWizardSeenAction();
      router.push("/app");
    });
  }

  function advance() {
    const next = nextStep(steps, current);
    if (next === null) {
      finishWizard();
      return;
    }
    setCurrent(next);
  }

  function goBack() {
    const prev = prevStep(steps, current);
    if (prev !== null) setCurrent(prev);
  }

  function onFocusChosen(chosen: ContentDiagnosticAnswer) {
    setFocus(chosen);
    // After focus, advance into that path's second step (income).
    const path = stepsForFocus(chosen);
    setCurrent(path[1] ?? "focus");
  }

  // "Pular por agora" skips the entire wizard.
  const skipAll = { label: "Pular por agora", onClick: finishWizard };

  if (current === "focus") {
    return (
      <FocusStep
        initialFocus={focus}
        stepNumber={stepNumber}
        totalSteps={steps.length}
        onChosen={onFocusChosen}
        onSkipAll={finishWizard}
        finishing={finishing}
      />
    );
  }

  if (current === "income") {
    return (
      <IncomeStep
        stepNumber={stepNumber}
        totalSteps={steps.length}
        onDone={advance}
        onBack={goBack}
        onSkipAll={finishWizard}
      />
    );
  }

  // Placeholder for steps implemented in Tasks 4-8. Each real step component is
  // swapped in here as it is built. Until then, render a shell that can advance.
  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={steps.length}
      title="Em breve"
      description="Passo em construcao."
      onBack={goBack}
      primary={{ label: "Continuar", onClick: advance, loading: finishing }}
      secondary={skipAll}
    >
      <p className="text-sm opacity-70">Passo {current}.</p>
    </WizardShell>
  );
}
