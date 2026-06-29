"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  replyFeedbackAction,
  setFeedbackStatusAction,
} from "../_actions/reply-feedback.action";

export function ReplyForm({
  feedbackId,
  status,
  hasReply,
}: {
  feedbackId: string;
  status: "aberto" | "respondido" | "fechado";
  hasReply: boolean;
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = reply.trim();
    if (text.length === 0) {
      setError("Escreva a resposta.");
      return;
    }
    if (hasReply && !window.confirm("Isso substitui a resposta atual. Continuar?")) {
      return;
    }
    setError(null);
    setBusy(true);
    const res = await replyFeedbackAction({ feedbackId, reply: text, alsoEmail });
    setBusy(false);
    if (res.ok) {
      setReply("");
      router.refresh();
    } else {
      setError(res.message ?? "Não deu pra enviar.");
    }
  }

  async function changeStatus(next: "aberto" | "fechado") {
    setBusy(true);
    const res = await setFeedbackStatusAction(feedbackId, next);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.message ?? "Não deu pra mudar o status.");
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] p-4">
      <h2 className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">Responder</h2>
      <p className="text-[0.75rem] text-[color:var(--text-muted)]">
        {hasReply
          ? "Já existe uma resposta. Enviar de novo substitui a anterior (não é conversa, é uma resposta única)."
          : "Resposta única e direta: o usuário recebe, mas não responde de volta por aqui."}
      </p>
      <textarea
        aria-label="Resposta"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="A resposta chega como notificação no app do usuário."
        className="w-full resize-none rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5 text-[0.875rem] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--color-brand-500)]"
      />
      <label className="flex items-center gap-2 text-[0.8125rem] text-[color:var(--text-secondary)]">
        <input
          type="checkbox"
          checked={alsoEmail}
          onChange={(e) => setAlsoEmail(e.target.checked)}
        />
        Também enviar por e-mail (via ajuda@)
      </label>

      {error ? (
        <p role="alert" className="text-[0.8125rem] text-[color:var(--semantic-negative)]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || reply.trim().length === 0}
          onClick={() => void send()}
          className="inline-flex items-center gap-2 rounded-lg bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-2 text-[0.8125rem] font-bold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} strokeWidth={2} aria-hidden className="animate-spin" /> : null}
          {hasReply ? "Substituir resposta" : "Enviar resposta"}
        </button>
        {status === "fechado" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void changeStatus("aberto")}
            className="rounded-lg border border-[color:var(--border-soft)] px-4 py-2 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] disabled:opacity-60"
          >
            Reabrir
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void changeStatus("fechado")}
            className="rounded-lg border border-[color:var(--border-soft)] px-4 py-2 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] disabled:opacity-60"
          >
            Marcar como fechado
          </button>
        )}
      </div>
    </section>
  );
}
