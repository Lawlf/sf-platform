"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useState } from "react";

const CONSENT_KEY = "sf_analytics_consent";
export const CONSENT_EVENT = "sf-analytics-consent";

/**
 * Gates Vercel Analytics + Speed Insights behind explicit consent (LGPD art. 7).
 * They only mount once the visitor has granted consent via the banner; the
 * banner dispatches `sf-analytics-consent` so this reacts without a reload.
 */
export function AnalyticsGated() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const read = () => setGranted(localStorage.getItem(CONSENT_KEY) === "granted");
    read();
    window.addEventListener(CONSENT_EVENT, read);
    return () => window.removeEventListener(CONSENT_EVENT, read);
  }, []);

  if (!granted) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
