"use client";

import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  fallbackHref?: Route;
  label?: string;
  /**
   * Ignora o histórico e vai direto pro fallbackHref. Use quando a tela tem um
   * pai canônico (ex.: detalhe → listagem) e router.back() cairia num passo de
   * wizard de criação em vez da lista.
   */
  preferFallback?: boolean;
}

export function BackButton({ fallbackHref, label = "Voltar", preferFallback = false }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (preferFallback && fallbackHref) {
      router.push(fallbackHref);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    if (fallbackHref) {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="focus-ring relative inline-flex w-fit items-center gap-1.5 rounded-full bg-[color:var(--surface-1)] px-3 py-1.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)] backdrop-blur-sm transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
    >
      <ArrowLeft size={14} strokeWidth={2} aria-hidden />
      {label}
    </button>
  );
}
