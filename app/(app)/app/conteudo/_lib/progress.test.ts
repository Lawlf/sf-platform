import { describe, expect, it } from "vitest";

import { computeTrilhaProgress } from "./progress";
import type { ModuleSpec } from "./trilhas";

const modules: ModuleSpec[] = [
  { num: 1, title: "A", subtitle: "a", status: "ready" },
  { num: 2, title: "B", subtitle: "b", status: "ready" },
  { num: 3, title: "C", subtitle: "c", status: "ready" },
];

describe("computeTrilhaProgress", () => {
  it("nada concluído: só o módulo 1 desbloqueado, próximo é 1", () => {
    const p = computeTrilhaProgress(modules, []);
    expect(p.completedCount).toBe(0);
    expect(p.nextNum).toBe(1);
    expect(p.unlocked).toEqual({ 1: true, 2: false, 3: false });
  });

  it("módulo 1 concluído: 2 desbloqueia, próximo é 2", () => {
    const p = computeTrilhaProgress(modules, [1]);
    expect(p.completedCount).toBe(1);
    expect(p.nextNum).toBe(2);
    expect(p.unlocked).toEqual({ 1: true, 2: true, 3: false });
  });

  it("todos concluídos: próximo é null, todos desbloqueados", () => {
    const p = computeTrilhaProgress(modules, [1, 2, 3]);
    expect(p.completedCount).toBe(3);
    expect(p.nextNum).toBeNull();
    expect(p.unlocked).toEqual({ 1: true, 2: true, 3: true });
  });
});
