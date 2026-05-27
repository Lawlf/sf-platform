import { describe, expect, it, vi } from "vitest";

import { getTrilhaProgress } from "./get-trilha-progress.use-case";

type Deps = Parameters<typeof getTrilhaProgress>[0];

function makeDeps(completed: number[]) {
  const progress = { findCompletedNums: vi.fn().mockResolvedValue(completed) };
  return { progress } as unknown as Deps;
}

describe("getTrilhaProgress", () => {
  it("devolve os números de módulos concluídos", async () => {
    const deps = makeDeps([1, 2]);
    const result = await getTrilhaProgress(deps, {
      userId: "user-1",
      trilhaSlug: "sair-do-vermelho",
    });
    expect(result.completedNums).toEqual([1, 2]);
    expect(deps.progress.findCompletedNums).toHaveBeenCalledWith("user-1", "sair-do-vermelho");
  });

  it("devolve vazio quando nada concluído", async () => {
    const deps = makeDeps([]);
    const result = await getTrilhaProgress(deps, {
      userId: "user-1",
      trilhaSlug: "sair-do-vermelho",
    });
    expect(result.completedNums).toEqual([]);
  });
});
