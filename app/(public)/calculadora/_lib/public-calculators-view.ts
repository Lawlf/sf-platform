import type { LucideIcon } from "lucide-react";

import {
  normalizeForSearch,
  SIM_CATEGORIES,
  SIMULATORS,
  type SimCategoryId,
} from "../../../(app)/app/simular/_lib/simulators";

import { PUBLIC_CALCULATORS } from "./public-calculators";

/**
 * Junta o registry público com a metadata interna (`SIMULATORS`) para montar o
 * hub: cada calculadora pública herda categoria, ícone, título e descrição
 * curtos do simulador interno correspondente, agrupados na ordem de
 * `SIM_CATEGORIES`. Vive separado de `public-calculators.ts` para que o sitemap
 * não puxe lucide-react no seu grafo.
 */
export interface PublicCalculatorCard {
  slug: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
}

export interface PublicCalculatorGroup {
  id: SimCategoryId;
  label: string;
  items: PublicCalculatorCard[];
}

/**
 * Busca pública sobre as calculadoras: casa a consulta contra título, descrição
 * e palavras-chave do simulador interno (sem acento, sem caixa). Devolve cards
 * achatados na ordem do registry. Consulta em branco retorna lista vazia.
 */
export function searchPublicCalculators(query: string): PublicCalculatorCard[] {
  const q = normalizeForSearch(query);
  if (q === "") return [];

  const simById = new Map(SIMULATORS.map((s) => [s.id, s]));
  const cards: PublicCalculatorCard[] = [];
  for (const calc of PUBLIC_CALCULATORS) {
    const sim = simById.get(calc.simId);
    if (!sim) continue;
    const haystack = normalizeForSearch(
      `${sim.title} ${sim.desc} ${sim.keywords.join(" ")} ${calc.h1}`,
    );
    if (haystack.includes(q)) {
      cards.push({ slug: calc.slug, title: sim.title, desc: sim.desc, Icon: sim.icon });
    }
  }
  return cards;
}

export function publicCalculatorsByCategory(): PublicCalculatorGroup[] {
  const simById = new Map(SIMULATORS.map((s) => [s.id, s]));

  const cards: Array<PublicCalculatorCard & { category: SimCategoryId }> = [];
  for (const calc of PUBLIC_CALCULATORS) {
    const sim = simById.get(calc.simId);
    if (!sim) continue;
    cards.push({
      slug: calc.slug,
      title: sim.title,
      desc: sim.desc,
      Icon: sim.icon,
      category: sim.category,
    });
  }

  return SIM_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    items: cards
      .filter((c) => c.category === cat.id)
      .map((c) => ({ slug: c.slug, title: c.title, desc: c.desc, Icon: c.Icon })),
  })).filter((group) => group.items.length > 0);
}
