import { Coins, ShoppingBag, TrendingUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface QuickAction {
  href: Route;
  label: string;
  description: string;
  icon: typeof Coins;
}

const ACTIONS: QuickAction[] = [
  {
    href: "/app/dividas/nova" as Route,
    label: "Adicionar compra ou dívida",
    description: "Cartão, parcelado, financiamento, cheque especial.",
    icon: ShoppingBag,
  },
  {
    href: "/app/renda/nova" as Route,
    label: "Adicionar renda",
    description: "Salário, dividendos, extras.",
    icon: TrendingUp,
  },
  {
    href: "/app/patrimonio/novo" as Route,
    label: "Adicionar ativo",
    description: "Carro, imóvel, investimento.",
    icon: Coins,
  },
];

export function CtaRow() {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="focus-ring flex items-center gap-3 rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3.5 text-left backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)] sm:flex-col sm:items-start sm:gap-2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
              <Icon size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                {a.label}
              </span>
              <span className="text-[0.6875rem] text-[color:var(--text-secondary)]">
                {a.description}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
