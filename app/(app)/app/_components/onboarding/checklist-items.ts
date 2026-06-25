import type { Route } from "next";

import type { OnboardingChecklist } from "@/application/use-cases/onboarding/get-onboarding-state.use-case";

export interface ChecklistItem {
  key: "income" | "debt" | "asset" | "goal";
  label: string;
  href: Route;
  done: boolean;
  dismissible: boolean;
}

export function buildChecklistItems(checklist: OnboardingChecklist): ChecklistItem[] {
  return [
    {
      key: "income",
      label: "Cadastre sua renda mensal",
      href: "/app/renda/nova" as Route,
      done: checklist.hasIncome,
      dismissible: false,
    },
    {
      key: "debt",
      label: "Adicione uma dívida",
      href: "/app/dividas/nova" as Route,
      done: checklist.hasDebt || checklist.debtDismissed,
      dismissible: true,
    },
    {
      key: "asset",
      label: "Registre um bem ou reserva",
      href: "/app/patrimonio/novo" as Route,
      done: checklist.hasAsset,
      dismissible: false,
    },
    {
      key: "goal",
      label: "Defina uma meta",
      href: "/app/metas/nova" as Route,
      done: checklist.hasGoal || checklist.goalDismissed,
      dismissible: true,
    },
  ];
}

export function allChecklistDone(checklist: OnboardingChecklist): boolean {
  return buildChecklistItems(checklist).every((item) => item.done);
}
