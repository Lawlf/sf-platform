"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 truncate rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2.5 font-mono text-[0.8125rem] text-[color:var(--text-primary)]">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "URL copiada" : "Copiar URL do conector"}
        className="focus-ring flex flex-none items-center gap-1.5 rounded-xl border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.14] px-3 py-2.5 text-[0.8125rem] font-bold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.22]"
      >
        {copied ? (
          <>
            <Check size={15} strokeWidth={2} aria-hidden />
            Copiado
          </>
        ) : (
          <>
            <Copy size={15} strokeWidth={2} aria-hidden />
            Copiar
          </>
        )}
      </button>
    </div>
  );
}
