"use client";

import { usePathname } from "next/navigation";

import { useFocusMode } from "../_lib/focus-mode";
import { useSelectionBarActive } from "../_lib/selection-bar";

import { BottomNav } from "./bottom-nav";

const IMMERSIVE_PREFIXES = [
  "/app/conteudo/trilha",
  "/app/conteudo/livros",
  "/app/conteudo/ritmo",
];

export function BottomNavGate({ activeIsPj }: { activeIsPj: boolean }) {
  const pathname = usePathname();
  const selectionActive = useSelectionBarActive();
  const focusActive = useFocusMode();
  const inImmersive = IMMERSIVE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (inImmersive || selectionActive || focusActive) return null;
  return <BottomNav activeIsPj={activeIsPj} />;
}
