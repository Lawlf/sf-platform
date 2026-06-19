"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import type { SerializedMeiInsight } from "../_actions/fetch-mei-diagnostic";
import { insightText } from "./insight-text";

interface InsightsExpandableProps {
  insights: SerializedMeiInsight[];
}

export function InsightsExpandable({ insights }: InsightsExpandableProps) {
  const [expanded, setExpanded] = useState(false);

  if (insights.length === 0 || !insights[0]) return null;

  const top = insights[0];
  const rest = insights.slice(1);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3">
        <p className="text-[0.875rem] leading-relaxed text-[color:var(--text-primary)]">
          {insightText(top)}
        </p>
      </div>

      {rest.length > 0 ? (
        <>
          {expanded ? (
            rest.map((ins, i) => (
              <div
                key={`${ins.kind}-${i}`}
                className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3"
              >
                <p className="text-[0.875rem] leading-relaxed text-[color:var(--text-primary)]">
                  {insightText(ins)}
                </p>
              </div>
            ))
          ) : null}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 self-start text-[0.8125rem] font-medium text-[color:var(--color-brand-700)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] focus-visible:ring-offset-1 rounded"
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronUp size={14} strokeWidth={2} aria-hidden />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown size={14} strokeWidth={2} aria-hidden />
                Ver mais ({rest.length} {rest.length === 1 ? "análise" : "análises"})
              </>
            )}
          </button>
        </>
      ) : null}
    </div>
  );
}
