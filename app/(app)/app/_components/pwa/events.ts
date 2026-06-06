import posthog from "posthog-js";

import type { PwaEnv } from "@/app/(app)/app/_lib/pwa/platform";

type Props = Record<string, string | number | boolean | null>;

function loaded(): boolean {
  return Boolean((posthog as unknown as { __loaded?: boolean }).__loaded);
}

function capture(event: string, props: Props): void {
  try {
    if (typeof window === "undefined") return;
    if (!loaded()) return;
    posthog.capture(event, props);
  } catch {
    return;
  }
}

function envProps(env: PwaEnv | null, plan: "free" | "pro"): Props {
  return {
    platform: env?.os ?? "other",
    browser: env?.browser ?? "other",
    display_mode: env?.standalone ? "standalone" : "browser",
    plan,
  };
}

export function trackEligible(env: PwaEnv | null, plan: "free" | "pro", reason: string): void {
  capture("pwa_install_eligible", { ...envProps(env, plan), trigger_reason: reason });
}

export function trackPromptShown(
  env: PwaEnv | null,
  plan: "free" | "pro",
  surface: string,
): void {
  capture("pwa_install_prompt_shown", { ...envProps(env, plan), surface });
}

export function trackCtaClicked(
  env: PwaEnv | null,
  plan: "free" | "pro",
  promptType: "native" | "custom_instruction",
): void {
  capture("pwa_install_prompt_cta_clicked", { ...envProps(env, plan), prompt_type: promptType });
}

export function trackNativeOutcome(
  env: PwaEnv | null,
  plan: "free" | "pro",
  outcome: "accepted" | "dismissed",
): void {
  capture("pwa_native_prompt_outcome", { ...envProps(env, plan), outcome });
}

export function trackDismissed(env: PwaEnv | null, plan: "free" | "pro"): void {
  capture("pwa_install_dismissed", envProps(env, plan));
}

export function trackIosInstructions(env: PwaEnv | null, plan: "free" | "pro"): void {
  capture("pwa_ios_instructions_viewed", envProps(env, plan));
}

export function trackInstalled(env: PwaEnv | null, plan: "free" | "pro"): void {
  capture("pwa_installed", envProps(env, plan));
  try {
    if (loaded()) {
      posthog.setPersonProperties({ is_pwa_installed: true });
    }
  } catch {
    return;
  }
}

export function trackStandaloneSession(env: PwaEnv | null, plan: "free" | "pro"): void {
  capture("pwa_session_standalone", envProps(env, plan));
}
