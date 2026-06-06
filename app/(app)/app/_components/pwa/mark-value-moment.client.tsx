"use client";

import { useEffect } from "react";

import { VALUE_MOMENT_EVENT } from "./install-provider.client";
import { markValueMomentStored, readPersisted } from "./storage";

export function MarkValueMoment({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    if (readPersisted().valueMoment) return;
    markValueMomentStored();
    window.dispatchEvent(new Event(VALUE_MOMENT_EVENT));
  }, [active]);

  return null;
}
