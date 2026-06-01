"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

const CONSENT_KEY = "sf_analytics_consent";
const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

export function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "granted") {
      posthog.opt_in_capturing();
    } else if (stored === "denied") {
      posthog.opt_out_capturing();
    } else {
      setVisible(true);
    }
  }, []);

  function decide(granted: boolean) {
    localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
    if (granted) {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4 shadow-[0_20px_50px_-20px_rgba(31,29,28,0.45)] backdrop-blur-xl sm:p-5">
      <p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
        A gente usa estatísticas de uso pra entender como o Sabor funciona e
        melhorar o produto. Seus valores financeiros não são coletados. Veja a{" "}
        <Link
          href="/privacidade"
          className="font-medium text-[color:var(--text-primary)] underline underline-offset-4"
        >
          Política de Privacidade
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => decide(false)}
          className="focus-ring rounded-full border border-[color:var(--border-strong)] px-5 py-2 text-sm font-semibold text-[color:var(--text-primary)]"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={() => decide(true)}
          className="focus-ring rounded-full bg-[color:var(--text-primary)] px-5 py-2 text-sm font-semibold text-[color:var(--bg-app)]"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
