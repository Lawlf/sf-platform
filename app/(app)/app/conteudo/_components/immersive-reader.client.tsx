"use client";

import { ChevronDown, ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ImmersiveReader({
  children,
  chapterLabel,
}: {
  children: ReactNode;
  chapterLabel: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Trava o scroll da página atrás; a leitura rola só dentro do overlay.
  useEffect(() => {
    const html = document.documentElement;
    const prevBody = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
    };
  }, []);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 24);
  }

  // Checa no mount (conteúdo pode ser curto e nem precisar de scroll).
  useEffect(() => {
    const id = window.setTimeout(onScroll, 60);
    return () => window.clearTimeout(id);
  }, []);

  const overlay = (
    <div className="bg-warm-gradient fixed inset-0 z-[100] flex flex-col overflow-hidden">
      <div className="bg-blob-top-right" aria-hidden />

      <div className="relative z-10 flex h-full flex-col">
        <div className="relative flex h-[72px] shrink-0 items-center justify-center border-b border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 backdrop-blur-xl">
          <Link
            href={"/app/conteudo/trilha" as Route}
            aria-label="Voltar para a trilha"
            className="focus-ring absolute left-3 flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)]"
          >
            <ChevronLeft size={18} aria-hidden />
            Trilha
          </Link>
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
            {chapterLabel}
          </span>
        </div>

        <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[640px] px-6 pb-16">{children}</div>
        </div>

        <div
          aria-hidden
          className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 transition-opacity duration-300 ${
            atBottom ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="grid h-9 w-9 animate-bounce place-items-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)] backdrop-blur-md">
            <ChevronDown size={18} aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(overlay, document.body) : null;
}
