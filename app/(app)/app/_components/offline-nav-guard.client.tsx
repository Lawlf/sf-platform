"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { isOfflineRoute } from "../_lib/offline/offline-routes";
import { useOnline } from "../_lib/offline/use-online";

export const OFFLINE_BLOCKED_MESSAGE =
  "Sem internet pra abrir isso. As calculadoras funcionam offline.";

export function OfflineNavGuard() {
  const online = useOnline();

  useEffect(() => {
    if (online) return;

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.origin !== window.location.origin) return;

      const pathname = anchor.pathname;
      if (!pathname.startsWith("/app")) return;
      if (isOfflineRoute(pathname)) return;

      event.preventDefault();
      event.stopPropagation();

      anchor.classList.remove("sf-offline-blocked");
      void anchor.offsetWidth;
      anchor.classList.add("sf-offline-blocked");
      anchor.addEventListener(
        "animationend",
        () => anchor.classList.remove("sf-offline-blocked"),
        { once: true },
      );

      toast(OFFLINE_BLOCKED_MESSAGE);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [online]);

  return null;
}
