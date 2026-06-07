import {
  Car,
  CreditCard,
  GraduationCap,
  HeartPulse,
  Home,
  PartyPopper,
  Plug,
  Receipt,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import type { ExpenseCategory } from "@/domain/entities/debt.entity";

export interface ExpenseCategoryOption {
  id: ExpenseCategory;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const EXPENSE_CATEGORIES: readonly ExpenseCategoryOption[] = [
  { id: "housing", label: "Moradia", description: "Aluguel, condomínio", icon: Home },
  { id: "utilities", label: "Contas", description: "Luz, água, internet", icon: Plug },
  { id: "food", label: "Alimentação", description: "Mercado, delivery", icon: UtensilsCrossed },
  { id: "transport", label: "Transporte", description: "Combustível, transporte", icon: Car },
  { id: "health", label: "Saúde", description: "Plano, farmácia", icon: HeartPulse },
  { id: "leisure", label: "Lazer", description: "Cinema, viagens", icon: PartyPopper },
  { id: "subscriptions", label: "Assinaturas", description: "Streaming, apps", icon: CreditCard },
  { id: "education", label: "Educação", description: "Cursos, mensalidades", icon: GraduationCap },
  { id: "other", label: "Outros", description: "Demais despesas", icon: Receipt },
] as const;

export const EXPENSE_CATEGORY_IDS = EXPENSE_CATEGORIES.map((c) => c.id) as [
  ExpenseCategory,
  ...ExpenseCategory[],
];

export function expenseCategoryLabel(id: ExpenseCategory | null | undefined): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? "Outros";
}
