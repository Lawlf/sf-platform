"use client";

import { createContext, useCallback, useContext, useState } from "react";

const KEY = "sf_hide_values";

interface Ctx {
  hidden: boolean;
  toggle: () => void;
}
const MoneyVisibilityContext = createContext<Ctx>({ hidden: false, toggle: () => {} });

/**
 * `initialHidden` is read server-side from the cookie in the (app) layout so the
 * first paint already reflects the user's choice, no flash of visible values on
 * reload. The cookie (not localStorage) is the source of truth so SSR can read it.
 */
export function MoneyVisibilityProvider({
  initialHidden = false,
  children,
}: {
  initialHidden?: boolean;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(initialHidden);
  const toggle = useCallback(() => {
    setHidden((h) => {
      const next = !h;
      try {
        document.cookie = `${KEY}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      } catch {}
      return next;
    });
  }, []);
  return (
    <MoneyVisibilityContext.Provider value={{ hidden, toggle }}>
      {children}
    </MoneyVisibilityContext.Provider>
  );
}

export function useMoneyVisibility(): Ctx {
  return useContext(MoneyVisibilityContext);
}
