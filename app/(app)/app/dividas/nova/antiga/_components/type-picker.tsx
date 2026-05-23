"use client";

import { CreditCard, Home, Wallet } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { KindCard } from "../../_components/kind-card";
import { WizardShell } from "../../_components/wizard-shell";

type AntigaTypeId = "cartao" | "emprestimo" | "financiamento";

interface AntigaTypeOption {
  id: AntigaTypeId;
  href: Route;
  title: string;
  description: string;
  icon: ReactNode;
}

const TYPES: readonly AntigaTypeOption[] = [
  {
    id: "cartao",
    href: "/app/dividas/nova/cartao?existing=1" as Route,
    title: "Cartão com saldo",
    description: "Cartão que você já usa e tem saldo devedor pra registrar.",
    icon: <CreditCard size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "emprestimo",
    href: "/app/dividas/nova/emprestimo?existing=1" as Route,
    title: "Empréstimo que já corre",
    description: "Empréstimo pessoal, consignado ou crediário que começou antes do app.",
    icon: <Wallet size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "financiamento",
    href: "/app/dividas/nova/financiamento?existing=1" as Route,
    title: "Financiamento que já corre",
    description: "Casa ou carro financiado iniciado antes do app.",
    icon: <Home size={20} strokeWidth={1.75} aria-hidden />,
  },
] as const;

export function TypePicker() {
  const router = useRouter();

  return (
    <WizardShell
      currentStep={2}
      totalSteps={3}
      title="Que tipo de dívida antiga?"
      description="Cartão, empréstimo ou financiamento que já começou antes do app."
      onBack={() => router.push("/app/dividas/nova" as Route)}
    >
      <div
        role="radiogroup"
        aria-label="Tipo de dívida antiga"
        className="flex flex-col gap-2 md:gap-3.5"
      >
        {TYPES.map((type) => (
          <KindCard
            key={type.id}
            icon={type.icon}
            title={type.title}
            description={type.description}
            selected={false}
            onSelect={() => router.push(type.href)}
          />
        ))}
      </div>
    </WizardShell>
  );
}
