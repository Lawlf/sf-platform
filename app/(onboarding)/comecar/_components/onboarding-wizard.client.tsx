"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
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
import { DebtStep } from "./steps/debt-step.client";
import { ResultPrescription } from "./steps/result-prescription.client";
import { GoalStep } from "./steps/goal-step.client";
import { ResultGoal } from "./steps/result-goal.client";
import { AssetStep } from "./steps/asset-step.client";
import { ResultNetWorth } from "./steps/result-networth.client";

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

  if (current === "debt") {
    return (
      <DebtStep stepNumber={stepNumber} totalSteps={steps.length} onDone={advance} onBack={goBack} onSkipAll={finishWizard} />
    );
  }
  if (current === "result-prescription") {
    return (
      <ResultPrescription stepNumber={stepNumber} totalSteps={steps.length} onFinish={finishWizard} finishing={finishing} />
    );
  }

  if (current === "goal") {
    return (
      <GoalStep stepNumber={stepNumber} totalSteps={steps.length} onDone={advance} onBack={goBack} onSkipAll={finishWizard} />
    );
  }
  if (current === "result-goal") {
    return (
      <ResultGoal stepNumber={stepNumber} totalSteps={steps.length} onFinish={finishWizard} finishing={finishing} />
    );
  }

  if (current === "asset") {
    return (
      <AssetStep stepNumber={stepNumber} totalSteps={steps.length} onDone={advance} onBack={goBack} onSkipAll={finishWizard} />
    );
  }
  if (current === "result-networth") {
    return (
      <ResultNetWorth stepNumber={stepNumber} totalSteps={steps.length} onFinish={finishWizard} finishing={finishing} />
    );
  }

  // All known steps handled above; anything else finishes safely.
  finishWizard();
  return null;
}
