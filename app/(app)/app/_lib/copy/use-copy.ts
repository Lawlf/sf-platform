"use client";

import { useCtx } from "./provider.client";
import { makeT, type Catalog } from "./types";

// Analog client do next-intl: const t = useCopy(catalog); t("chave").
// Na migração futura: useCopy(catalog) -> useTranslations("ns"), t() inalterado.
export function useCopy<C extends Catalog>(catalog: C) {
  return makeT(catalog, useCtx());
}
