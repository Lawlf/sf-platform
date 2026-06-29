"use client";

import { useSyncExternalStore } from "react";

// Sinal global: telas de fluxo focado (wizard steps) ligam o modo foco pra
// esconder a top-bar e a bottom-nav mobile e devolver a tela inteira pra tarefa.
// Mantem o cabeçalho minimo do proprio shell (voltar + progresso) como unica saida.
let active = false;
const listeners = new Set<() => void>();

export function setFocusMode(next: boolean): void {
  if (active === next) return;
  active = next;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.focusMode = next ? "true" : "false";
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useFocusMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => active,
    () => false,
  );
}
