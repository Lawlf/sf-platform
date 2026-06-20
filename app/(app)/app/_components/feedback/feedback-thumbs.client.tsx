"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";

import { submitFeedbackAction } from "../../_actions/submit-feedback.action";

type Phase = "ask" | "comment" | "done";

function storageKey(surface: string): string {
  return `sf_fb_${surface}`;
}

function alreadyAnswered(surface: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(surface)) !== null;
  } catch {
    return false;
  }
}

function markAnswered(surface: string): void {
  try {
    window.localStorage.setItem(storageKey(surface), "1");
  } catch {
    return;
  }
}

export function FeedbackThumbs({
  surface,
  question = "Isso ficou claro?",
}: {
  surface: string;
  question?: string;
}) {
  const [phase, setPhase] = useState<Phase>("ask");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(alreadyAnswered(surface));
  }, [surface]);

  if (hidden) return null;

  async function send(sentiment: "up" | "down", withComment?: string) {
    setSubmitting(true);
    const res = await submitFeedbackAction({
      surface,
      sentiment,
      ...(withComment ? { comment: withComment } : {}),
    });
    setSubmitting(false);
    if (res.ok) {
      markAnswered(surface);
      setPhase("done");
    }
  }

  if (phase === "done") {
    return (
      <p className="mt-3 border-t border-dashed border-[color:var(--border-soft)] pt-3 text-[0.75rem] text-[color:var(--text-muted)]">
        Valeu pelo retorno.
      </p>
    );
  }

  if (phase === "comment") {
    return (
      <div className="mt-3 flex flex-col gap-2 border-t border-dashed border-[color:var(--border-soft)] pt-3">
        <label htmlFor={`fb-${surface}`} className="text-[0.75rem] text-[color:var(--text-secondary)]">
          O que ficou confuso? (opcional)
        </label>
        <textarea
          id={`fb-${surface}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={2000}
          className="w-full resize-none rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.8125rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
        <button
          type="button"
          disabled={submitting}
          onClick={() => void send("down", comment.trim() || undefined)}
          className="sf-lift focus-ring inline-flex h-9 w-fit items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 text-[0.8125rem] font-bold text-white disabled:opacity-60"
        >
          Enviar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-3 border-t border-dashed border-[color:var(--border-soft)] pt-3">
      <span className="text-[0.75rem] text-[color:var(--text-secondary)]">{question}</span>
      <button
        type="button"
        disabled={submitting}
        aria-label="Sim, ficou claro"
        onClick={() => void send("up")}
        className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--semantic-positive)]/40 hover:text-[color:var(--semantic-positive)] disabled:opacity-60"
      >
        <ThumbsUp size={15} strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        disabled={submitting}
        aria-label="Não ficou claro"
        onClick={() => setPhase("comment")}
        className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--semantic-negative)]/40 hover:text-[color:var(--semantic-negative)] disabled:opacity-60"
      >
        <ThumbsDown size={15} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
