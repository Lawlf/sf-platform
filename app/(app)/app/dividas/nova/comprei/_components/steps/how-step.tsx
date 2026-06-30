"use client";

import { Banknote, CreditCard, Home, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import type { PaymentMethod } from "../../_actions/create-purchase.action";

import { WizardRadioCard } from "@/ui/wizard-radio-card";

interface PaymentOption {
  id: PaymentMethod;
  title: string;
  description: string;
  icon: ReactNode;
}

const METHODS: readonly PaymentOption[] = [
  {
    id: "cash",
    title: "À vista",
    description: "Pix, débito, dinheiro.",
    icon: <Banknote size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "credit_card",
    title: "Cartão de crédito",
    description: "Parcelado ou à vista no cartão.",
    icon: <CreditCard size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "loan",
    title: "Empréstimo ou crediário",
    description: "Banco, consignado, parcelado na loja.",
    icon: <Wallet size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "financing",
    title: "Financiei casa ou carro",
    description: "Financiamento de longo prazo com taxa. Caixa, Itaú, banco da concessionária.",
    icon: <Home size={20} strokeWidth={1.75} aria-hidden />,
  },
] as const;

export interface HowStepProps {
  onSelectMethod: (method: PaymentMethod) => void;
}

export function HowStep({ onSelectMethod }: HowStepProps) {
  return (
    <div role="radiogroup" aria-label="Método de pagamento" className="flex flex-col gap-2">
      {METHODS.map((m) => (
        <WizardRadioCard
          key={m.id}
          icon={m.icon}
          title={m.title}
          description={m.description}
          active={false}
          variant="primary"
          onSelect={() => onSelectMethod(m.id)}
        />
      ))}
    </div>
  );
}
