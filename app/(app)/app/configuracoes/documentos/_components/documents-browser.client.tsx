"use client";

import { Download, FileText, Image as ImageIcon, Search, Share2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Spinner } from "@/app/components/ui/spinner";
import type { UserDocument } from "@/application/use-cases/attachments/list-user-documents.use-case";

import { getAttachmentDownloadUrlAction } from "../../../_actions/entity-attachments.action";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  docs: UserDocument[];
}

export function DocumentsBrowser({ docs }: Props) {
  const [query, setQuery] = useState("");
  const [activeParent, setActiveParent] = useState("Todos");
  const [sharingId, setSharingId] = useState<string | null>(null);

  const parents = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const doc of docs) {
      if (!seen.has(doc.parentLabel)) {
        seen.add(doc.parentLabel);
        ordered.push(doc.parentLabel);
      }
    }
    return ["Todos", ...ordered];
  }, [docs]);

  const trimmedQuery = query.trim();
  const normalizedQuery = normalize(trimmedQuery);

  const rows = useMemo(() => {
    return docs.filter((doc) => {
      const okParent = activeParent === "Todos" || doc.parentLabel === activeParent;
      const okQuery =
        !normalizedQuery ||
        normalize(doc.fileName).includes(normalizedQuery) ||
        normalize(doc.parentLabel).includes(normalizedQuery);
      return okParent && okQuery;
    });
  }, [docs, activeParent, normalizedQuery]);

  function onSearchChange(value: string) {
    setQuery(value);
    if (value.trim()) setActiveParent("Todos");
  }

  async function handleShare(doc: UserDocument) {
    setSharingId(doc.id);
    try {
      const { url } = await getAttachmentDownloadUrlAction({ attachmentId: doc.id });
      if (!url) return;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], doc.fileName, { type: doc.contentType });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: doc.fileName });
        } else if (navigator.share) {
          await navigator.share({ title: doc.fileName, url });
        } else {
          window.open(url, "_blank");
        }
      } catch {
        window.open(url, "_blank");
      }
    } finally {
      setSharingId(null);
    }
  }

  async function handleDownload(doc: UserDocument) {
    const { url } = await getAttachmentDownloadUrlAction({ attachmentId: doc.id });
    if (url) window.open(url, "_blank");
  }

  const counter =
    activeParent === "Todos"
      ? `${rows.length} ${rows.length === 1 ? "documento" : "documentos"}`
      : `${rows.length} ${rows.length === 1 ? "documento" : "documentos"} do ${activeParent}`;

  return (
    <div>
      <div className="relative">
        <Search
          size={17}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[color:var(--text-muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar arquivo ou dívida..."
          autoComplete="off"
          className="focus-ring w-full rounded-2xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] py-3 pl-11 pr-4 text-[0.9375rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)]"
        />
      </div>

      {parents.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {parents.map((parent) => {
            const on = parent === activeParent;
            return (
              <button
                key={parent}
                type="button"
                onClick={() => setActiveParent(parent)}
                className={`focus-ring whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                  on
                    ? "border-[color:var(--text-primary)] bg-[color:var(--text-primary)] text-[color:var(--surface-1)]"
                    : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)]"
                }`}
              >
                {parent}
              </button>
            );
          })}
        </div>
      ) : null}

      {docs.length > 0 ? (
        <p className="mb-2 mt-4 text-[0.75rem] text-[color:var(--text-muted)]">{counter}</p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-6 py-10 text-center text-[0.84375rem] text-[color:var(--text-secondary)]">
          {docs.length === 0 ? (
            <>
              <span className="mb-1.5 block text-[0.90625rem] font-bold text-[color:var(--text-primary)]">
                Nada guardado por aqui ainda.
              </span>
              Anexa o contrato ou o comprovante na dívida e ele aparece aqui, já com o nome dela.
              Quando alguém pedir, você acha em segundos.
            </>
          ) : (
            "Nenhum arquivo com esse nome. Tenta o nome da dívida, ou filtra ali em cima."
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((doc) => {
            const sharing = sharingId === doc.id;
            return (
              <li
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3.5 py-3"
              >
                <span className="shrink-0 text-[color:var(--text-secondary)]">
                  {isImage(doc.contentType) ? (
                    <ImageIcon size={19} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <FileText size={19} strokeWidth={1.75} aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.6875rem] font-semibold text-[color:var(--color-brand-700)]">
                    {doc.parentLabel}
                  </span>
                  <span className="block truncate text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                    {doc.fileName}
                  </span>
                  <span className="mt-px block text-[0.6875rem] text-[color:var(--text-muted)]">
                    {formatDate(doc.createdAtIso)}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Compartilhar ${doc.fileName}`}
                  disabled={sharing}
                  onClick={() => void handleShare(doc)}
                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--color-brand-700)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.12] disabled:opacity-60"
                >
                  {sharing ? (
                    <Spinner size={16} className="text-[color:var(--color-brand-700)]" />
                  ) : (
                    <Share2 size={16} strokeWidth={2} aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Baixar ${doc.fileName}`}
                  onClick={() => void handleDownload(doc)}
                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
                >
                  <Download size={16} strokeWidth={2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
