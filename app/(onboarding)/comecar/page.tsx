import { redirect } from "next/navigation";

import { fetchOnboardingState } from "@/app/(app)/app/_actions/onboarding";

import { OnboardingWizardClient } from "./_components/onboarding-wizard.client";

export default async function ComecarPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const state = await fetchOnboardingState();

  // If the wizard was already seen, never show it again.
  if (state.wizardSeen) redirect("/app");

  // Step lido no server (?step=) e passado como prop: retoma a posição sem
  // useSearchParams no cliente (que assinava mudanças e remontava o subtree).
  const { step } = await searchParams;

  return <OnboardingWizardClient initialFocus={state.focus} initialStep={step ?? null} />;
}
