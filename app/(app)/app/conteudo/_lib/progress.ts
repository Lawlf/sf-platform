import type { ModuleSpec } from "./trilhas";

export interface TrilhaProgressView {
  completedCount: number;
  totalReady: number;
  nextNum: number | null;
  unlocked: Record<number, boolean>;
  completed: Record<number, boolean>;
}

export function computeTrilhaProgress(
  modules: readonly ModuleSpec[],
  completedNums: readonly number[],
): TrilhaProgressView {
  const done = new Set(completedNums);
  const ready = modules.filter((m) => m.status === "ready");
  const unlocked: Record<number, boolean> = {};
  const completed: Record<number, boolean> = {};

  let prevDone = true; // o primeiro ready abre por padrão
  for (const m of modules) {
    const isReady = m.status === "ready";
    const isDone = done.has(m.num);
    completed[m.num] = isDone;
    unlocked[m.num] = isReady && (isDone || prevDone);
    if (isReady) prevDone = isDone;
  }

  const nextNum = ready.find((m) => !done.has(m.num))?.num ?? null;
  return {
    completedCount: ready.filter((m) => done.has(m.num)).length,
    totalReady: ready.length,
    nextNum,
    unlocked,
    completed,
  };
}
