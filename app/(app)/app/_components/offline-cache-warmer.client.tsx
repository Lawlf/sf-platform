"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { OFFLINE_SIMULATOR_HREFS } from "../_lib/offline/offline-routes";
import { useOnline } from "../_lib/offline/use-online";

const WARMED_KEY = "sf_offline_warmed";

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function OfflineCacheWarmer() {
  const router = useRouter();
  const online = useOnline();

  useEffect(() => {
    if (!online) return;
    if (sessionStorage.getItem(WARMED_KEY) === "1") return;

    // Aquece cada simulador de duas formas: prefetch (RSC + chunks JS, cobre a
    // navegação interna) e fetch do documento (cobre abrir/recarregar a URL
    // direto offline). Sequencial pra não estourar requisições de uma vez.
    async function warm() {
      sessionStorage.setItem(WARMED_KEY, "1");
      for (const href of OFFLINE_SIMULATOR_HREFS) {
        if (!navigator.onLine) {
          sessionStorage.removeItem(WARMED_KEY);
          return;
        }
        router.prefetch(href);
        try {
          await fetch(href, { credentials: "same-origin" });
        } catch {
          sessionStorage.removeItem(WARMED_KEY);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
    }

    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(() => {
        void warm();
      });
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => {
      void warm();
    }, 2500);
    return () => window.clearTimeout(id);
  }, [online, router]);

  return null;
}
