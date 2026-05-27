import { DEFAULT_QUICK_ACCESS, MAX_QUICK_ACCESS, normalizeQuickAccess } from "@/domain/services/quick-access.service";

export type QuickAccessCategory = "adicionar" | "simular" | "navegar";

export interface CatalogEntry {
  key: string;
  label: string;
  shortLabel: string;
  href: string;
  category: QuickAccessCategory;
  icon: string;
}

export const QUICK_ACCESS_CATALOG: CatalogEntry[] = [
  { key: "add_debt", label: "Adicionar dívida", shortLabel: "Dívida", href: "/app/dividas/nova", category: "adicionar", icon: "ShoppingBag" },
  { key: "add_income", label: "Adicionar renda", shortLabel: "Renda", href: "/app/renda/nova", category: "adicionar", icon: "TrendingUp" },
  { key: "add_asset", label: "Adicionar ativo", shortLabel: "Ativo", href: "/app/patrimonio/novo", category: "adicionar", icon: "Coins" },
  { key: "sim_quitacao", label: "Simular quitação", shortLabel: "Quitação", href: "/app/simular/quitacao", category: "simular", icon: "Target" },
  { key: "sim_extra", label: "Simular pagamento extra", shortLabel: "Extra", href: "/app/simular/extra", category: "simular", icon: "Plus" },
  { key: "sim_estrategia", label: "Simular estratégia", shortLabel: "Estratégia", href: "/app/simular/estrategia", category: "simular", icon: "GitCompare" },
  { key: "sim_compra", label: "Calculadora de compra", shortLabel: "Regra 3", href: "/app/simular/compra", category: "simular", icon: "Calculator" },
  { key: "sim_hub", label: "Simuladores", shortLabel: "Simular", href: "/app/simular", category: "simular", icon: "PlusCircle" },
  { key: "timeline", label: "Linha do tempo", shortLabel: "Tempo", href: "/app/linha-do-tempo", category: "navegar", icon: "LineChart" },
  { key: "conteudo", label: "Conteúdo", shortLabel: "Conteúdo", href: "/app/conteudo", category: "navegar", icon: "BookOpen" },
  { key: "dividas", label: "Minhas dívidas", shortLabel: "Dívidas", href: "/app/dividas", category: "navegar", icon: "Wallet" },
  { key: "renda", label: "Minha renda", shortLabel: "Rendas", href: "/app/renda", category: "navegar", icon: "Banknote" },
  { key: "patrimonio", label: "Meu patrimônio", shortLabel: "Patrimônio", href: "/app/patrimonio", category: "navegar", icon: "PiggyBank" },
  { key: "comprei", label: "Comprei", shortLabel: "Comprei", href: "/app/comprei", category: "navegar", icon: "Receipt" },
  { key: "notificacoes", label: "Notificações", shortLabel: "Avisos", href: "/app/notificacoes", category: "navegar", icon: "Bell" },
];

export const CATALOG_KEYS: string[] = QUICK_ACCESS_CATALOG.map((e) => e.key);

const BY_KEY = new Map(QUICK_ACCESS_CATALOG.map((e) => [e.key, e]));

export function resolveQuickAccess(keys: string[]): CatalogEntry[] {
  const normalized = normalizeQuickAccess(keys, CATALOG_KEYS, MAX_QUICK_ACCESS);
  const effective = normalized.length > 0 ? normalized : DEFAULT_QUICK_ACCESS;
  return effective.map((k) => BY_KEY.get(k)).filter((e): e is CatalogEntry => Boolean(e));
}
