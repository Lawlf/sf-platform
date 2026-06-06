"use client";

import { createContext, useContext } from "react";

import type { PwaEnv } from "@/app/(app)/app/_lib/pwa/platform";

export interface InstallContextValue {
  env: PwaEnv | null;
  isPro: boolean;
  canPromptNative: boolean;
  bannerVisible: boolean;
  promptInstall: (surface: string) => void;
  openIosSheet: (surface: string) => void;
  dismissBanner: () => void;
}

export const InstallContext = createContext<InstallContextValue | null>(null);

export function useInstall(): InstallContextValue | null {
  return useContext(InstallContext);
}
