import type { ResolvedCategory } from "@/domain/categories/resolve-categories";

import { CategoryError } from "./category.errors";

const MAX_NAME_LENGTH = 24;

export function requirePro(isPro: boolean): void {
  if (!isPro) {
    throw new CategoryError("Personalizar categorias é um recurso do plano Pro.");
  }
}

export function validateCategoryName(
  raw: string,
  resolved: readonly ResolvedCategory[],
  opts?: { ignoreKey?: string },
): string {
  const name = raw.trim();
  if (name.length === 0) throw new CategoryError("Dê um nome pra categoria.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new CategoryError(`Nome muito longo. Use até ${MAX_NAME_LENGTH} caracteres.`);
  }
  const lower = name.toLocaleLowerCase("pt-BR");
  const duplicate = resolved.some(
    (c) => c.key !== opts?.ignoreKey && c.label.toLocaleLowerCase("pt-BR") === lower,
  );
  if (duplicate) throw new CategoryError("Já existe uma categoria com esse nome.");
  return name;
}
