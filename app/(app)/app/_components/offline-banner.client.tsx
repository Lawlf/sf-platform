"use client";

import { CloudOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { shouldAnnounceReconnect } from "../_lib/offline/reconnect";
import { useOnline } from "../_lib/offline/use-online";

export function OfflineBanner() {
  const online = useOnline();
  const previousOnline = useRef(true);

  useEffect(() => {
    if (shouldAnnounceReconnect(previousOnline.current, online)) {
      toast.success("Internet de volta. Números atualizados.");
    }
    previousOnline.current = online;
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-[72px] z-10 flex items-center gap-2 border-b border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-2.5 backdrop-blur-md md:top-[56px]"
    >
      <CloudOff className="size-4 shrink-0 text-[color:var(--text-secondary)]" aria-hidden />
      <p className="text-[13px] leading-snug text-[color:var(--text-secondary)]">
        Sem internet agora. Os números podem estar desatualizados, mas dá pra usar as calculadoras.
      </p>
    </div>
  );
}
