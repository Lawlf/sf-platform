"use client";

import { Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

// Variante dos CTAs de bridge para a calculadora pública (visitante deslogado):
// em vez de mandar para uma rota logada, captura o momento de valor e leva ao
// cadastro. As calculadoras públicas são alavanca de aquisição.
export function SimSignupCta({ label }: { label?: string }) {
  return (
    <Link
      href={"/cadastrar" as Route}
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-brand-500)] px-4 py-3 text-sm font-semibold text-white"
    >
      <Sparkles size={18} strokeWidth={2} aria-hidden />
      {label ?? "Criar conta para acompanhar"}
    </Link>
  );
}

export function isPublicCalc(pathname: string | null): boolean {
  return pathname?.startsWith("/calculadora") ?? false;
}
