"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { Delete, Fingerprint } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/app/components/icons/brand-logo";

import {
  beginUnlockPasskeyAction,
  confirmUnlockPasskeyAction,
  unlockWithPinAction,
} from "./app-lock.actions";

interface AppLockScreenProps {
  hasPasskey: boolean;
  onUnlocked: () => void;
}

const PIN_LENGTH = 4;

export function AppLockScreen({ hasPasskey, onUnlocked }: AppLockScreenProps) {
  // When a passkey exists we lead with biometrics and auto-trigger it; otherwise
  // we go straight to the PIN pad. The PIN is always available as a fallback.
  const [mode, setMode] = useState<"biometric" | "pin">(hasPasskey ? "biometric" : "pin");
  const [bioRunning, setBioRunning] = useState(false);
  const [bioError, setBioError] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinChecking, setPinChecking] = useState(false);
  const autoRan = useRef(false);

  const runBiometric = useCallback(async () => {
    setBioRunning(true);
    setBioError(false);
    try {
      const optionsJSON = await beginUnlockPasskeyAction();
      const resp = await startAuthentication({ optionsJSON });
      const res = await confirmUnlockPasskeyAction(resp);
      if (res.ok) {
        onUnlocked();
        return;
      }
      setBioError(true);
    } catch {
      // user dismissed the prompt or it failed, surface a retry affordance
      setBioError(true);
    } finally {
      setBioRunning(false);
    }
  }, [onUnlocked]);

  // Fire Face/Touch ID automatically, but ONLY while this screen is actually
  // visible and focused, never prompt in a backgrounded/unfocused tab. If we
  // mount unfocused, wait for the window to gain focus, then trigger once.
  useEffect(() => {
    if (mode !== "biometric" || !hasPasskey) return;
    const tryAuto = () => {
      if (autoRan.current) return;
      if (document.visibilityState === "visible" && document.hasFocus()) {
        autoRan.current = true;
        void runBiometric();
      }
    };
    tryAuto();
    window.addEventListener("focus", tryAuto);
    document.addEventListener("visibilitychange", tryAuto);
    return () => {
      window.removeEventListener("focus", tryAuto);
      document.removeEventListener("visibilitychange", tryAuto);
    };
  }, [mode, hasPasskey, runBiometric]);

  const submitPin = useCallback(
    async (value: string) => {
      setPinChecking(true);
      setPinError(null);
      try {
        const res = await unlockWithPinAction(value);
        if (res.ok) {
          onUnlocked();
          return;
        }
        setPinError(res.message ?? "PIN incorreto.");
        setPin("");
      } finally {
        setPinChecking(false);
      }
    },
    [onUnlocked],
  );

  const pushDigit = useCallback(
    (d: string) => {
      if (pinChecking) return;
      setPinError(null);
      setPin((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = prev + d;
        if (next.length === PIN_LENGTH) void submitPin(next);
        return next;
      });
    },
    [pinChecking, submitPin],
  );

  const popDigit = useCallback(() => {
    setPinError(null);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  // Physical keyboard support on desktop while the PIN pad is showing.
  useEffect(() => {
    if (mode !== "pin") return;
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) pushDigit(e.key);
      else if (e.key === "Backspace") popDigit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, pushDigit, popDigit]);

  return (
    <div className="bg-warm-gradient fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden px-6">
      <div className="bg-blob-top-right" aria-hidden />
      <div className="bg-blob-bottom-left" aria-hidden />

      <div className="relative z-10 flex w-full max-w-xs flex-col items-center">
        <BrandLogo size={64} glow alt="" />
        <h1 className="mt-3 text-[1.0625rem] font-extrabold tracking-tight text-[color:var(--text-primary)]">
          Sabor Financeiro
        </h1>
        <p className="mt-1 text-[0.8125rem] font-medium text-[color:var(--text-secondary)]">
          {mode === "biometric"
            ? bioRunning
              ? "Desbloqueando…"
              : "Toque para desbloquear"
            : "Digite seu PIN para entrar"}
        </p>

        {mode === "biometric" ? (
          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => void runBiometric()}
              disabled={bioRunning}
              aria-label="Desbloquear com Face ID ou Touch ID"
              className="focus-ring flex h-24 w-24 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)] transition-transform active:scale-95 disabled:opacity-60"
            >
              <Fingerprint size={44} strokeWidth={1.5} aria-hidden />
            </button>
            {bioError ? (
              <p role="alert" className="text-center text-[0.8125rem] text-[color:var(--semantic-negative)]">
                Não foi possível usar a biometria. Toque novamente ou use o PIN.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setMode("pin")}
              className="focus-ring rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.1]"
            >
              Usar PIN
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-7">
            <div
              className="flex items-center gap-4"
              role="status"
              aria-live="polite"
              aria-label={`${pin.length} de ${PIN_LENGTH} dígitos`}
            >
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={`h-3.5 w-3.5 rounded-full transition-colors ${
                    pinError
                      ? "bg-[color:var(--semantic-negative)]"
                      : i < pin.length
                        ? "bg-[color:var(--color-brand-500)]"
                        : "bg-[color:var(--border-soft)]"
                  }`}
                />
              ))}
            </div>

            {pinError ? (
              <p role="alert" className="-mt-3 text-[0.8125rem] text-[color:var(--semantic-negative)]">
                {pinError}
              </p>
            ) : null}

            <div className="grid grid-cols-3 gap-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <Key key={d} onClick={() => pushDigit(d)} disabled={pinChecking}>
                  {d}
                </Key>
              ))}
              {hasPasskey ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("biometric");
                    setPin("");
                    setPinError(null);
                  }}
                  aria-label="Usar biometria"
                  className="focus-ring flex h-[68px] w-[68px] items-center justify-center justify-self-center rounded-full text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--surface-2)]"
                >
                  <Fingerprint size={26} strokeWidth={1.6} aria-hidden />
                </button>
              ) : (
                <span aria-hidden />
              )}
              <Key onClick={() => pushDigit("0")} disabled={pinChecking}>
                0
              </Key>
              <button
                type="button"
                onClick={popDigit}
                disabled={pinChecking || pin.length === 0}
                aria-label="Apagar"
                className="focus-ring flex h-[68px] w-[68px] items-center justify-center justify-self-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-40"
              >
                <Delete size={24} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Key({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus-ring glass-light flex h-[68px] w-[68px] items-center justify-center justify-self-center rounded-full text-[1.75rem] font-semibold text-[color:var(--text-primary)] transition-transform active:scale-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
