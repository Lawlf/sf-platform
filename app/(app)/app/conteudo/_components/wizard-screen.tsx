"use client";

import { ArrowRight, Crown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { saveDiagnosticAction } from "../_actions/save-diagnostic.action";
import type { AnswerOption } from "../_lib/diagnostic-mapping";
import { ANSWER_OPTIONS } from "../_lib/diagnostic-mapping";

import { AnswerCard } from "./answer-card";

export interface WizardScreenProps {
  locked: boolean;
}

export function WizardScreen({ locked }: WizardScreenProps) {
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function submit(option: AnswerOption) {
    if (locked) return;
    setPendingAnswer(option.answer);
    const fd = new FormData();
    fd.set("answer", option.answer);
    startTransition(async () => {
      await saveDiagnosticAction(fd);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section
        className="rounded-[20px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
        style={{ boxShadow: "0 4px 16px -4px rgba(31,29,28,0.06)" }}
      >
        <div className="mb-2.5 inline-flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-800)]">
          <span
            className="block h-[1.5px] w-3.5 rounded-full"
            style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
          />
          1 pergunta, 10 segundos
        </div>
        <h2 className="text-[1.25rem] font-bold leading-[1.3] tracking-[-0.02em] text-[color:var(--text-primary)]">
          Se sobrasse{" "}
          <span
            className="px-0.5"
            style={{
              backgroundImage:
                "linear-gradient(120deg, rgba(242,142,37,0.25), rgba(242,142,37,0.25))",
              backgroundSize: "100% 38%",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "0 85%",
            }}
          >
            R$ 500 amanhã
          </span>
          , pra onde ele iria primeiro?
        </h2>
      </section>

      {locked ? (
        <ProUpgradeCallout />
      ) : (
        <>
          <div className="mx-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            Responde com honestidade
          </div>
          <div className="flex flex-col gap-2.5">
            {ANSWER_OPTIONS.map((option) => (
              <AnswerCard
                key={option.answer}
                num={option.num}
                title={option.title}
                description={option.description}
                onSelect={() => submit(option)}
                pending={pendingAnswer === option.answer}
                disabled={pendingAnswer !== null && pendingAnswer !== option.answer}
              />
            ))}
          </div>
        </>
      )}

      <p className="mt-2 text-center text-[0.6875rem] leading-[1.45] text-[color:var(--text-muted)]">
        Você muda de trilha quando quiser.{" "}
        <strong className="font-bold text-[color:var(--text-secondary)]">
          A gente só esconde o que ainda não faz sentido pra você.
        </strong>
      </p>
    </div>
  );
}

function ProUpgradeCallout() {
  return (
    <section
      className="relative overflow-hidden rounded-[18px] border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, rgba(242,142,37,0.16), transparent 60%)",
      }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 place-items-center rounded-[10px] text-white"
          style={{
            background: "linear-gradient(135deg,#f28e25,#ef7a1a)",
            boxShadow: "0 8px 18px -6px rgba(239,122,26,0.55)",
          }}
        >
          <Crown size={18} strokeWidth={2.2} aria-hidden />
        </span>
        <div>
          <div className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-800)]">
            Só pra Pro
          </div>
          <div className="text-[0.9375rem] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
            Responde a pergunta e a gente monta sua trilha
          </div>
        </div>
      </div>
      <p className="mb-4 text-[0.78125rem] leading-[1.5] text-[color:var(--text-secondary)]">
        No Pro a trilha aparece pronta, com módulos chegando no seu ritmo e uma leitura
        recomendada por dor de verdade. R$ 19,90/mês, cancela quando quiser.
      </p>
      <Link
        href={"/app/configuracoes/planos" as Route}
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[0.84375rem] font-bold text-white"
        style={{ boxShadow: "0 10px 24px -8px rgba(239,122,26,0.5)" }}
      >
        Virar Pro
        <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
      </Link>
    </section>
  );
}
