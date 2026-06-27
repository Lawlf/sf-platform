"use client";

import { useSyncExternalStore } from "react";

// Sinal global: quando uma tela entra em modo de seleção (multi-seleção de
// itens), a bottom-nav some e a tela mostra sua própria barra de ações
// dedicada no lugar. Evita a barra flutuante colidindo com a nav.
let active = false;
const listeners = new Set<() => void>();

export function setSelectionBarActive(next: boolean): void {
  if (active === next) return;
  active = next;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useSelectionBarActive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => active,
    () => false,
  );
}
