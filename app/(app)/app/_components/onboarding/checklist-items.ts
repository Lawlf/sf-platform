import type { Route } from "next";

import type { OnboardingChecklist } from "@/application/use-cases/onboarding/get-onboarding-state.use-case";

export interface ChecklistItem {
  key: "income" | "debt" | "asset" | "goal";
  label: string;
  href: Route;
  done: boolean;
}

export function buildChecklistItems(checklist: OnboardingChecklist): ChecklistItem[] {
  return [
    { key: "income", label: "Cadastre sua renda mensal", href: "/app/renda/nova" as Route, done: checklist.hasIncome },
    { key: "debt", label: "Adicione uma dívida", href: "/app/dividas/nova" as Route, done: checklist.hasDebt },
    { key: "asset", label: "Registre um bem ou reserva", href: "/app/patrimonio/novo" as Route, done: checklist.hasAsset },
    { key: "goal", label: "Defina uma meta", href: "/app/metas/nova" as Route, done: checklist.hasGoal },
  ];
}

export function allChecklistDone(checklist: OnboardingChecklist): boolean {
  return checklist.hasIncome && checklist.hasDebt && checklist.hasAsset && checklist.hasGoal;
}
