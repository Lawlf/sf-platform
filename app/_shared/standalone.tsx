"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface StandaloneState {
  isStandalone: boolean;
  isReady: boolean;
}

const StandaloneContext = createContext<StandaloneState>({
  isStandalone: false,
  isReady: false,
});

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  const androidTwa = document.referrer.startsWith("android-app://");
  return Boolean(displayMode) || iosStandalone || androidTwa;
}

export function StandaloneProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StandaloneState>({ isStandalone: false, isReady: false });

  useEffect(() => {
    const mql = window.matchMedia("(display-mode: standalone)");
    const sync = () => {
      const value = detectStandalone();
      setState({ isStandalone: value, isReady: true });
      document.documentElement.dataset.standalone = value ? "true" : "false";
    };
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  return <StandaloneContext.Provider value={state}>{children}</StandaloneContext.Provider>;
}

export function useStandalone(): StandaloneState {
  return useContext(StandaloneContext);
}
