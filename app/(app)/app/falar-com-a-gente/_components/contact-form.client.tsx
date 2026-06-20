"use client";

import { Check, ChevronDown, ImagePlus, Loader2, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  requestFeedbackUploadAction,
  submitFeedbackAction,
} from "../../_actions/submit-feedback.action";
import { WizardField, wizardInputClass } from "../../dividas/nova/_components/wizard-field";
import { simSelectClass } from "../../simular/_components/sim-result";

type Kind = "problema" | "sugestao" | "duvida";

interface Attachment {
  key: string;
  name: string;
}

const KINDS: { value: Kind; label: string }[] = [
  { value: "problema", label: "Problema" },
  { value: "sugestao", label: "Sugestão" },
  { value: "duvida", label: "Dúvida" },
];

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;

export function ContactForm() {
  const [kind, setKind] = useState<Kind>("problema");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFiles(files: FileList) {
    setError(null);
    const room = MAX_FILES - attachments.length;
    if (room <= 0) {
      setError(`Você pode anexar até ${MAX_FILES} imagens.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    setUploading(true);
    const uploaded: Attachment[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) {
        setError("Só dá pra anexar imagens (print da tela, por exemplo).");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError("Cada imagem precisa ter até 10 MB.");
        continue;
      }
      const res = await requestFeedbackUploadAction({
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!res.ok) {
        setError("Não deu pra anexar uma das imagens. Tente outra.");
        continue;
      }
      await fetch(res.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      uploaded.push({ key: res.storageKey, name: file.name });
    }
    setAttachments((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeAt(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    const text = message.trim();
    if (text.length === 0) {
      setError("Escreva o que aconteceu.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const keys = attachments.map((a) => a.key);
    const res = await submitFeedbackAction({
      surface: "app:contato",
      kind,
      comment: text,
      ...(keys.length > 0 ? { attachmentKeys: keys } : {}),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      setError(res.message);
    }
  }

  if (done) {
    return (
      <section className="glass-light flex flex-col items-start gap-2 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]">
          <Check size={20} strokeWidth={2} aria-hidden />
        </span>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Recebido</h2>
        <p className="text-sm text-[color:var(--text-secondary)]">
          Valeu por escrever. A gente responde aqui no app em alguns dias.
        </p>
        <Link
          href={"/app/falar-com-a-gente/mensagens" as Route}
          className="focus-ring mt-1 text-[0.875rem] font-semibold text-[color:var(--color-brand-800)] hover:underline"
        >
          Ver suas mensagens
        </Link>
      </section>
    );
  }

  return (
    <section className="glass-light p-5">
      <WizardField label="O que é?" htmlFor="contact-kind">
        <div className="relative">
          <select
            id="contact-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className={simSelectClass}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            strokeWidth={2}
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
          />
        </div>
      </WizardField>

      <WizardField
        label="O que aconteceu?"
        htmlFor="contact-message"
        helper="Descreva com detalhes: o que você fez, o que esperava e o que aconteceu."
      >
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={2000}
          className={`${wizardInputClass} resize-none`}
        />
      </WizardField>

      <WizardField label="Imagens (opcional)" helper={`Até ${MAX_FILES} imagens, 10 MB cada.`}>
        {attachments.length > 0 ? (
          <ul className="mb-2 flex flex-col gap-2">
            {attachments.map((a, i) => (
              <li
                key={a.key}
                className="flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.875rem] text-[color:var(--text-primary)]"
              >
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`Remover ${a.name}`}
                  className="focus-ring flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                >
                  <X size={14} strokeWidth={2} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {attachments.length < MAX_FILES ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-[color:var(--border-strong)] px-4 py-3 text-[0.875rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--color-brand-500)]/40 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 size={16} strokeWidth={2} aria-hidden className="animate-spin" />
            ) : (
              <ImagePlus size={16} strokeWidth={1.75} aria-hidden />
            )}
            {attachments.length > 0 ? "Anexar mais" : "Anexar print"}
          </button>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = e.target.files;
            if (fs && fs.length > 0) void handleFiles(fs);
          }}
        />
      </WizardField>

      {error ? (
        <p
          role="alert"
          className="mb-[14px] rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={submitting || uploading || message.trim().length === 0}
        onClick={() => void submit()}
        className="sf-lift focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-6 text-[0.875rem] font-bold text-white disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 size={16} strokeWidth={2} aria-hidden className="animate-spin" />
        ) : null}
        Enviar
      </button>
    </section>
  );
}
