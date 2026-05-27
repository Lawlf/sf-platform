"use client";

import { useEffect, useState } from "react";

const KEY = "sf:sfx-muted";

export function useSfxMuted(): [boolean, () => void] {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(KEY) === "1");
    } catch {
      // ignora storage indisponível
    }
  }, []);

  function toggle() {
    setMuted((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        // ignora storage indisponível
      }
      return next;
    });
  }

  return [muted, toggle];
}
