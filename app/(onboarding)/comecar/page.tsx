import { redirect } from "next/navigation";

import { fetchOnboardingState } from "@/app/(app)/app/_actions/onboarding";

import { OnboardingWizardClient } from "./_components/onboarding-wizard.client";

export default async function ComecarPage() {
  const state = await fetchOnboardingState();

  // If the wizard was already seen, never show it again.
  if (state.wizardSeen) redirect("/app");

  return <OnboardingWizardClient initialFocus={state.focus} />;
}
