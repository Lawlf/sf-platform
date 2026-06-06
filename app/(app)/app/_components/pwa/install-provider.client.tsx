"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  registerDismissed,
  registerShown,
  shouldShowBanner,
  type GatingState,
} from "@/app/(app)/app/_lib/pwa/gating";
import { detectPwaEnv, type PwaEnv } from "@/app/(app)/app/_lib/pwa/platform";

import {
  trackCtaClicked,
  trackDismissed,
  trackEligible,
  trackInstalled,
  trackIosInstructions,
  trackNativeOutcome,
  trackPromptShown,
  trackStandaloneSession,
} from "./events";
import { InstallBanner } from "./install-banner.client";
import { InstallContext, type InstallContextValue } from "./install-context";
import { IosInstallSheet } from "./ios-install-sheet.client";
import {
  bumpSession,
  markInstalled,
  persistDismissed,
  persistShown,
  readPersisted,
} from "./storage";

export const VALUE_MOMENT_EVENT = "sf-pwa-value-moment";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)");
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(mql?.matches) || iosStandalone === true;
}

export function InstallProvider({
  isPro,
  children,
}: {
  isPro: boolean;
  children: React.ReactNode;
}) {
  const [env, setEnv] = useState<PwaEnv | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const sessionCountRef = useRef(0);
  const plan = isPro ? "pro" : "free";

  const buildGatingState = useCallback((currentEnv: PwaEnv | null): GatingState => {
    const p = readPersisted();
    const supported = currentEnv
      ? deferredRef.current !== null || currentEnv.canInstallIos
      : false;
    return {
      installed: p.installed,
      standalone: currentEnv?.standalone ?? false,
      supported,
      valueMoment: p.valueMoment,
      sessionCount: sessionCountRef.current,
      shownInCycle: p.shownInCycle,
      cycleStart: p.cycleStart,
      lastDismissedAt: p.lastDismissedAt,
    };
  }, []);

  const evaluate = useCallback(
    (currentEnv: PwaEnv | null) => {
      if (!currentEnv) return;
      const state = buildGatingState(currentEnv);
      const now = Date.now();
      if (shouldShowBanner(state, now)) {
        const shown = registerShown(state, now);
        persistShown(shown);
        trackPromptShown(currentEnv, plan, "dashboard_banner");
        setBannerVisible(true);
      }
    },
    [buildGatingState, plan],
  );

  useEffect(() => {
    const detected = detectPwaEnv({
      userAgent: window.navigator.userAgent,
      standalone: isStandalone(),
    });
    setEnv(detected);
    sessionCountRef.current = bumpSession();

    if (detected.standalone) {
      trackStandaloneSession(detected, plan);
      return;
    }

    const persisted = readPersisted();
    if (!persisted.valueMoment && sessionCountRef.current >= 2) {
      trackEligible(detected, plan, "second_session");
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      evaluate(detected);
    }
    function onAppInstalled() {
      markInstalled();
      trackInstalled(detected, plan);
      setBannerVisible(false);
      setSheetOpen(false);
      toast.success("Pronto. O Sabor já está na sua tela inicial.");
    }
    function onValueMoment() {
      trackEligible(detected, plan, "value_moment");
      evaluate(detected);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener(VALUE_MOMENT_EVENT, onValueMoment);

    evaluate(detected);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener(VALUE_MOMENT_EVENT, onValueMoment);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openIosSheet = useCallback(
    (surface: string) => {
      void surface;
      trackCtaClicked(env, plan, "custom_instruction");
      trackIosInstructions(env, plan);
      setBannerVisible(false);
      setSheetOpen(true);
    },
    [env, plan],
  );

  const promptInstall = useCallback(
    async (surface: string) => {
      const deferred = deferredRef.current;
      if (deferred) {
        trackCtaClicked(env, plan, "native");
        deferred.prompt();
        try {
          const choice = await deferred.userChoice;
          trackNativeOutcome(env, plan, choice.outcome);
        } catch {
          return;
        } finally {
          deferredRef.current = null;
          setBannerVisible(false);
        }
        return;
      }
      openIosSheet(surface);
    },
    [env, plan, openIosSheet],
  );

  const dismissBanner = useCallback(() => {
    const now = Date.now();
    const state = registerDismissed(buildGatingState(env), now);
    persistDismissed(state);
    trackDismissed(env, plan);
    setBannerVisible(false);
  }, [buildGatingState, env, plan]);

  const value = useMemo<InstallContextValue>(
    () => ({
      env,
      isPro,
      canPromptNative: deferredRef.current !== null,
      bannerVisible,
      promptInstall,
      openIosSheet,
      dismissBanner,
    }),
    [env, isPro, bannerVisible, promptInstall, openIosSheet, dismissBanner],
  );

  return (
    <InstallContext.Provider value={value}>
      {children}
      <InstallBanner />
      <IosInstallSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        showProPushNote={isPro && env?.os === "ios"}
      />
    </InstallContext.Provider>
  );
}
