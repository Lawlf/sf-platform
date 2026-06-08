"use client";

import { useOnline } from "../_lib/offline/use-online";

export function OfflineStaleNote() {
  const online = useOnline();
  if (online) return null;

  return (
    <p className="-mt-1 px-1 text-[0.8125rem] text-[color:var(--text-muted)] md:col-span-2">
      Números de quando você abriu por último.
    </p>
  );
}
