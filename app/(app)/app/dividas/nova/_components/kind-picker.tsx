import type { Route } from "next";
import Link from "next/link";

const KINDS = [
  {
    href: "/app/dividas/nova/financiamento" as Route,
    title: "Financiamento",
    desc: "Imóvel ou veículo (Price ou SAC).",
  },
  {
    href: "/app/dividas/nova/emprestimo" as Route,
    title: "Empréstimo pessoal",
    desc: "Consignado ou pessoal, parcelas fixas.",
  },
  {
    href: "/app/dividas/nova/cartao" as Route,
    title: "Cartão de crédito",
    desc: "Fatura, parcelamento, rotativo.",
  },
  {
    href: "/app/dividas/nova/cheque-especial" as Route,
    title: "Cheque especial",
    desc: "Limite no banco com juros diários.",
  },
] as const;

export function KindPicker() {
  return (
    <div className="flex flex-col gap-3">
      {KINDS.map((k) => (
        <Link
          key={k.href}
          href={k.href}
          className="glass-light flex flex-col gap-1 p-4 transition-colors hover:bg-white/70"
        >
          <span className="text-sm font-semibold text-[color:var(--color-brand-800)]">
            {k.title}
          </span>
          <span className="text-xs opacity-70">{k.desc}</span>
        </Link>
      ))}
    </div>
  );
}
