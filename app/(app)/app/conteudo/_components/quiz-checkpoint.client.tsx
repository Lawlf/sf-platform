"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

export interface ResolvedQuizOption {
  label: string;
  correct: boolean;
  feedback?: string;
}

export interface ResolvedQuiz {
  prompt: string;
  options: ResolvedQuizOption[];
}

export function QuizCheckpoint({ quiz }: { quiz: ResolvedQuiz[] }) {
  if (quiz.length === 0) return null;
  return (
    <section className="mt-8 flex flex-col gap-5">
      <div className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
        Checkpoint
      </div>
      {quiz.map((q, i) => (
        <QuizItem key={i} quiz={q} />
      ))}
    </section>
  );
}

function QuizItem({ quiz }: { quiz: ResolvedQuiz }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <p className="font-serif text-[1rem] font-semibold leading-[1.3] text-[color:var(--text-primary)]">
        {quiz.prompt}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {quiz.options.map((o, idx) => {
          const isPicked = picked === idx;
          const reveal = picked !== null;
          const tone = !reveal
            ? "border-[color:var(--border-soft)]"
            : o.correct
              ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.08]"
              : isPicked
                ? "border-[color:var(--border-strong)] opacity-70"
                : "border-[color:var(--border-soft)] opacity-50";
          return (
            <button
              key={idx}
              type="button"
              disabled={reveal}
              onClick={() => setPicked(idx)}
              className={`flex items-center justify-between gap-3 rounded-[12px] border px-3.5 py-2.5 text-left text-[0.875rem] text-[color:var(--text-primary)] ${tone}`}
            >
              <span>{o.label}</span>
              {reveal && o.correct ? <Check size={15} aria-hidden /> : null}
              {reveal && isPicked && !o.correct ? <X size={15} aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      {picked !== null && quiz.options[picked]?.feedback ? (
        <p className="mt-3 text-[0.8125rem] leading-[1.5] text-[color:var(--text-secondary)]">
          {quiz.options[picked]?.feedback}
        </p>
      ) : null}
    </div>
  );
}
