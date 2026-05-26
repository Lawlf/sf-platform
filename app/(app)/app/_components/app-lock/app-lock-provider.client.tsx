"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AppLockScreen } from "./app-lock-screen.client";

interface AppLockProviderProps {
  enabled: boolean;
  timeoutSeconds: number;
  hasPasskey: boolean;
  children: React.ReactNode;
}

/**
 * Locks the app behind a passkey/PIN screen. Locks on:
 *  - fresh load / reload (initial state = enabled),
 *  - `timeoutSeconds` of in-page inactivity (idle timer; reset on interaction),
 *  - returning to the tab after being hidden longer than `timeoutSeconds`
 *    (timeout 0 = lock on every resume).
 * The (app) layout persists across client navigations, so the provider does NOT
 * remount on in-app navigation, it only relocks on real reload / idle / resume.
 */
export function AppLockProvider({
  enabled,
  timeoutSeconds,
  hasPasskey,
  children,
}: AppLockProviderProps) {
  const [locked, setLocked] = useState(enabled);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenAt = useRef<number | null>(null);

  const clearIdle = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  // (Re)start the inactivity countdown. timeout 0 means "lock on resume only",
  // so there is no in-page idle timer in that mode.
  const armIdle = useCallback(() => {
    clearIdle();
    if (!enabled || timeoutSeconds <= 0) return;
    idleTimer.current = setTimeout(() => setLocked(true), timeoutSeconds * 1000);
  }, [enabled, timeoutSeconds, clearIdle]);

  const onUnlocked = useCallback(() => {
    setLocked(false);
    armIdle();
  }, [armIdle]);

  // If the user just unlocked (or the app mounts unlocked because lock is off),
  // make sure the idle countdown is running.
  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      clearIdle();
      return;
    }
    if (!locked) armIdle();
    return clearIdle;
  }, [enabled, locked, armIdle, clearIdle]);

  useEffect(() => {
    if (!enabled) return;
    const onActivity = () => {
      if (!lockedRef.current) armIdle();
    };
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        clearIdle();
        return;
      }
      if (lockedRef.current) return;
      const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
      hiddenAt.current = null;
      if (timeoutSeconds <= 0 || away > timeoutSeconds * 1000) setLocked(true);
      else armIdle();
    }
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    window.addEventListener("scroll", onActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("scroll", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [enabled, timeoutSeconds, armIdle, clearIdle]);

  return (
    <>
      {children}
      {locked ? <AppLockScreen hasPasskey={hasPasskey} onUnlocked={onUnlocked} /> : null}
    </>
  );
}
