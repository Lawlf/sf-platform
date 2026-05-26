"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { HEARTBEAT_INTERVAL_SECONDS } from "@/shared/usage";

export function UsageHeartbeat() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    function ping() {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/usage/ping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: pathRef.current }),
        keepalive: true,
      }).catch(() => {});
    }
    let id: number = 0;
    function start() {
      id = window.setInterval(ping, HEARTBEAT_INTERVAL_SECONDS * 1000) as unknown as number;
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        ping();
        window.clearInterval(id);
        start();
      }
    }
    ping(); // initial ping on mount
    start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
