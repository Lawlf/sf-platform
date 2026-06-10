"use client";

import { AlertTriangle, Clock, CreditCard, Repeat, ShoppingBag, Wallet } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { KindCard } from "./kind-card";
import { WizardShell } from "./wizard-shell";

type ActionId = "comprei" | "cartao" | "recorrente" | "emprestimo" | "antiga" | "cheque-especial";

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
      "À vista, cartão parcelado, crediário ou financiamento. Notebook, geladeira, carro, até IPVA parcelado.",
    icon: <ShoppingBag size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "cartao",
    href: "/app/dividas/nova/cartao" as Route,
    title: "Tenho cartão de crédito",
    description: "Fatura mensal, limite, vencimento. Sem listar compra por compra.",
    icon: <CreditCard size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "recorrente",
    href: "/app/dividas/nova/recorrente" as Route,
    title: "Conta ou assinatura fixa",
    description: "Netflix, academia, plano de saúde, escola. O que sai todo mês sem você comprar de novo.",
    icon: <Repeat size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "emprestimo",
    href: "/app/dividas/nova/emprestimo" as Route,
    title: "Peguei dinheiro emprestado",
    description:
      "Empréstimo do banco, consignado, ou dinheiro que você deve pra alguém (amigo, família). Sem compra atrelada.",
    icon: <Wallet size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "antiga",
    href: "/app/dividas/nova/antiga" as Route,
    title: "Lembrei de dívida antiga",
    description:
      "Empréstimo, financiamento ou cartão que já corria antes do app. Você lança só o saldo que falta, sem detalhar cada parcela.",
    icon: <Clock size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "cheque-especial",
    href: "/app/dividas/nova/cheque-especial" as Route,
    title: "Estourei o limite da conta",
    description: "Saldo negativo, cheque especial. Juros todo dia, o mais caro.",
    icon: <AlertTriangle size={20} strokeWidth={1.75} aria-hidden />,
  },
] as const;

export function KindPicker() {
  const router = useRouter();

  return (
    <WizardShell
      hideSteps
      currentStep={1}
      title="O que aconteceu?"
      description="Uma compra, um cartão, uma assinatura, dinheiro que você deve pra alguém ou algo antigo. Pode ser pequeno."
      onBack={() => router.push("/app/dividas" as Route)}
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
