"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { markWizardSeenAction } from "@/app/(app)/app/_actions/onboarding";
import type { WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";

import {
  stepsForFocus,
  nextStep,
  prevStep,
  type WizardStepId,
} from "../_lib/wizard-machine";

import { AssetStep } from "./steps/asset-step.client";
import { DebtStep } from "./steps/debt-step.client";
import { FocusStep } from "./steps/focus-step.client";
import { GoalStep } from "./steps/goal-step.client";
import { IncomeStep } from "./steps/income-step.client";
import { ResultGoal } from "./steps/result-goal.client";
import { ResultNetWorth } from "./steps/result-networth.client";
import { ResultPrescription } from "./steps/result-prescription.client";

export function OnboardingWizardClient({
  initialFocus,
  initialStep,
}: {
  initialFocus: ContentDiagnosticAnswer | null;
  initialStep: string | null;
}) {
  const router = useRouter();
  const [focus, setFocus] = useState<ContentDiagnosticAnswer | null>(initialFocus);
  // Recupera a posição do ?step= (lido no server) num reload/crash. Validamos
  // contra o caminho do focus persistido; step inválido cai no primeiro.
  const [current, setCurrent] = useState<WizardStepId>(() => {
    const path = stepsForFocus(initialFocus);
    return initialStep && path.includes(initialStep as WizardStepId)
      ? (initialStep as WizardStepId)
      : path[0]!;
  });
  const [finishing, startFinish] = useTransition();

  const steps = useMemo(() => stepsForFocus(focus), [focus]);
  const stepNumber = (Math.max(0, steps.indexOf(current)) + 1) as WizardStep;

  // Troca de step + espelha na URL de forma imperativa (no handler, antes do
  // novo step montar). Num useEffect, o replaceState rodava DEPOIS do fetch do
  // step começar e o Next abortava o server action em voo (spinner infinito).
  function go(step: WizardStepId) {
    setCurrent(step);
    window.history.replaceState(null, "", `${window.location.pathname}?step=${step}`);
  }

  function finishWizard() {
    startFinish(async () => {
      const res = await markWizardSeenAction();
      if (!res.ok) {
        toast.error("Não foi possível concluir agora. Tente de novo.");
        return;
      }
      router.push("/app");
    });
  }

  function advance() {
    const next = nextStep(steps, current);
    if (next === null) {
      finishWizard();
      return;
    }
    go(next);
  }

  function goBack() {
    const prev = prevStep(steps, current);
    if (prev !== null) go(prev);
  }

  function onFocusChosen(chosen: ContentDiagnosticAnswer) {
    setFocus(chosen);
    // After focus, advance into that path's second step (income).
    const path = stepsForFocus(chosen);
    go(path[1] ?? "focus");
  }

  if (current === "focus") {
    return (
      <FocusStep
        initialFocus={focus}
        stepNumber={stepNumber}
        totalSteps={steps.length}
        onChosen={onFocusChosen}
        onBack={() => router.push("/app")}
        onSkip={advance}
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
        onSkip={advance}
      />
    );
  }

  if (current === "debt") {
    return (
      <DebtStep stepNumber={stepNumber} totalSteps={steps.length} onDone={advance} onBack={goBack} onSkip={advance} />
    );
  }
  if (current === "result-prescription") {
    return (
      <ResultPrescription stepNumber={stepNumber} totalSteps={steps.length} onFinish={finishWizard} onBack={goBack} finishing={finishing} />
    );
  }

  if (current === "goal") {
    return (
      <GoalStep stepNumber={stepNumber} totalSteps={steps.length} onDone={advance} onBack={goBack} onSkip={advance} />
    );
  }
  if (current === "result-goal") {
    return (
      <ResultGoal stepNumber={stepNumber} totalSteps={steps.length} onFinish={finishWizard} onBack={goBack} finishing={finishing} />
    );
  }

  if (current === "asset") {
    return (
      <AssetStep stepNumber={stepNumber} totalSteps={steps.length} onDone={advance} onBack={goBack} onSkip={advance} />
    );
  }
  if (current === "result-networth") {
    return (
      <ResultNetWorth stepNumber={stepNumber} totalSteps={steps.length} onFinish={finishWizard} onBack={goBack} finishing={finishing} />
    );
  }

  // All known steps handled above; anything else finishes safely.
  finishWizard();
  return null;
}
