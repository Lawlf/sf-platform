export type CategoryDomain = "expense" | "inflow";

export interface DefaultCategory {
  slug: string;
  label: string;
  icon: string;
}

export const FALLBACK_CATEGORY_SLUG = "outros";

export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultCategory[] = [
  { slug: "moradia", label: "Moradia", icon: "House" },
  { slug: "contas", label: "Contas", icon: "Plug" },
  { slug: "mercado", label: "Mercado", icon: "ShoppingCart" },
  { slug: "alimentacao", label: "Alimentação", icon: "Utensils" },
  { slug: "transporte", label: "Transporte", icon: "Car" },
  { slug: "saude", label: "Saúde", icon: "HeartPulse" },
  { slug: "assinaturas", label: "Assinaturas", icon: "CreditCard" },
  { slug: "educacao", label: "Educação", icon: "GraduationCap" },
  { slug: "lazer", label: "Lazer", icon: "Ticket" },
  { slug: "compras", label: "Compras", icon: "ShoppingBag" },
  { slug: "outros", label: "Outros", icon: "Tag" },
];

export const DEFAULT_INFLOW_CATEGORIES: readonly DefaultCategory[] = [
  { slug: "transferencia", label: "Transferência", icon: "ArrowLeftRight" },
  { slug: "presente", label: "Presente", icon: "Gift" },
  { slug: "reembolso", label: "Reembolso", icon: "Undo2" },
  { slug: "venda", label: "Venda", icon: "Store" },
  { slug: "outros", label: "Outros", icon: "Tag" },
];

export function defaultCategoriesFor(domain: CategoryDomain): readonly DefaultCategory[] {
  return domain === "expense" ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INFLOW_CATEGORIES;
}

export const CATEGORY_ICON_NAMES: readonly string[] = [
  "House",
  "Plug",
  "ShoppingCart",
  "Utensils",
  "Car",
  "HeartPulse",
  "CreditCard",
  "GraduationCap",
  "Ticket",
  "ShoppingBag",
  "Tag",
  "PawPrint",
  "Baby",
  "Church",
  "Plane",
  "Shirt",
  "Dumbbell",
  "Wrench",
  "Smartphone",
  "Gamepad2",
  "Gift",
  "PiggyBank",
];

const LEGACY_DEBT_CATEGORY_MAP: Record<string, string> = {
  housing: "moradia",
  utilities: "contas",
  food: "alimentacao",
  transport: "transporte",
  health: "saude",
  leisure: "lazer",
  subscriptions: "assinaturas",
  education: "educacao",
  other: "outros",
};

export function normalizeLegacyExpenseCategory(raw: string): string {
  return LEGACY_DEBT_CATEGORY_MAP[raw] ?? raw;
}
