"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "./bottom-nav";

const IMMERSIVE_PREFIXES = [
  "/app/conteudo/trilha",
  "/app/conteudo/livros",
  "/app/conteudo/ritmo",
];

export function BottomNavGate({ activeIsPj }: { activeIsPj: boolean }) {
  const pathname = usePathname();
  const inImmersive = IMMERSIVE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (inImmersive) return null;
  return <BottomNav activeIsPj={activeIsPj} />;
}
