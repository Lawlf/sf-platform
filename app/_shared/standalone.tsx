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

function suppressAutofill(el: Element) {
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;
  el.setAttribute("autocomplete", "off");
  el.setAttribute("data-1p-ignore", "true");
  el.setAttribute("data-lpignore", "true");
  el.setAttribute("data-form-type", "other");
}

function enforceNoAutofill(): () => void {
  document.querySelectorAll("input, textarea").forEach(suppressAutofill);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches("input, textarea")) suppressAutofill(node);
        node.querySelectorAll("input, textarea").forEach(suppressAutofill);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
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

  useEffect(() => {
    if (!state.isStandalone) return;
    return enforceNoAutofill();
  }, [state.isStandalone]);

  return <StandaloneContext.Provider value={state}>{children}</StandaloneContext.Provider>;
}

export function useStandalone(): StandaloneState {
  return useContext(StandaloneContext);
}
