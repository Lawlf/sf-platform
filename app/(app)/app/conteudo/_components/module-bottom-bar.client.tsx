"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

export function ModuleBottomBar() {
  return (
    <nav
      aria-label="Navegação do módulo"
      className="fixed bottom-2 left-2 right-2 z-20 mx-auto flex max-w-md items-center gap-2 rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5 backdrop-blur-xl md:hidden"
      style={{ boxShadow: "0 16px 40px -8px rgba(31,29,28,0.12)" }}
    >
      <Link
        href={"/app/conteudo/trilha" as Route}
        aria-label="Voltar para a trilha"
        className="focus-ring flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]"
      >
        <ChevronLeft size={16} aria-hidden />
        Trilha
      </Link>
    </nav>
  );
}
