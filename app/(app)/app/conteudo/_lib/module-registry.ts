import { module01 } from "../_content/sair-do-vermelho/01.beats";

import type { ModuleBeats } from "./beats";

const REGISTRY: ModuleBeats[] = [module01];

export function findModuleBeats(trilhaSlug: string, num: number): ModuleBeats | null {
  return REGISTRY.find((m) => m.trilhaSlug === trilhaSlug && m.num === num) ?? null;
}
