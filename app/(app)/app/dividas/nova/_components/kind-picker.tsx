"use client";

import { AlertTriangle, Clock, Repeat, ShoppingBag, Wallet } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { KindCard } from "./kind-card";
import { WizardShell } from "./wizard-shell";

type ActionId = "comprei" | "emprestimo" | "recorrente" | "cheque-especial" | "antiga";

interface ActionOption {
  id: ActionId;
  href: Route;
  title: string;
  description: string;
  icon: ReactNode;
}

const ACTIONS: readonly ActionOption[] = [
  {
    id: "comprei",
    href: "/app/dividas/nova/comprei" as Route,
    title: "Comprei algo",
    description:
      "Pix, débito, cartão parcelado, crediário ou financiamento. Notebook, geladeira, sofá, carro.",
    icon: <ShoppingBag size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "emprestimo",
    href: "/app/dividas/nova/emprestimo" as Route,
    title: "Peguei dinheiro emprestado",
    description:
      "Empréstimo pessoal, consignado, dinheiro emprestado pra emergência ou pagar outra dívida. Sem compra atrelada.",
    icon: <Wallet size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "recorrente",
    href: "/app/dividas/nova/recorrente" as Route,
    title: "Tenho conta que vem todo mês",
    description: "Netflix, Spotify, academia, escola, plano de saúde.",
    icon: <Repeat size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "cheque-especial",
    href: "/app/dividas/nova/cheque-especial" as Route,
    title: "Estourei o limite da conta",
    description: "Saldo negativo, cheque especial. Juros todo dia, o mais caro.",
    icon: <AlertTriangle size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "antiga",
    href: "/app/dividas/nova/antiga" as Route,
    title: "Lembrei de dívida antiga",
    description: "Empréstimo, financiamento ou cartão que já corre antes do app.",
    icon: <Clock size={20} strokeWidth={1.75} aria-hidden />,
  },
] as const;

export function KindPicker() {
  const router = useRouter();

  return (
    <WizardShell
      currentStep={1}
      title="O que aconteceu?"
      description="Não precisa ser dívida grande. Pode ser uma compra, uma conta nova, algo antigo que esqueceu."
      onBack={() => router.push("/app" as Route)}
    >
      <div role="radiogroup" aria-label="O que aconteceu" className="flex flex-col gap-2 md:gap-3.5">
        {ACTIONS.map((action) => (
          <KindCard
            key={action.id}
            icon={action.icon}
            title={action.title}
            description={action.description}
            selected={false}
            onSelect={() => router.push(action.href)}
          />
        ))}
      </div>
    </WizardShell>
  );
}
