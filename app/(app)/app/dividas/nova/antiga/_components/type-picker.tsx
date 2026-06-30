"use client";

import { CreditCard, HandCoins, Home } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { KindCard } from "@/ui/kind-card";
import { WizardShell } from "@/app/(app)/app/_components/wizard-shell";

function withLinkAsset(href: string, linkAssetId: string | null): Route {
  if (!linkAssetId) return href as Route;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}linkAssetId=${encodeURIComponent(linkAssetId)}` as Route;
}

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
    description: "Cartão que você já usa e tem fatura pra registrar.",
    icon: <CreditCard size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "emprestimo",
    href: "/app/dividas/nova/emprestimo?existing=1" as Route,
    title: "Empréstimo que já começou",
    description: "Empréstimo pessoal, consignado ou crediário que começou antes do app.",
    icon: <HandCoins size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "financiamento",
    href: "/app/dividas/nova/financiamento?existing=1" as Route,
    title: "Financiamento que já começou",
    description: "Casa ou carro financiado iniciado antes do app.",
    icon: <Home size={20} strokeWidth={1.75} aria-hidden />,
  },
] as const;

export function TypePicker() {
  const router = useRouter();
  const linkAssetId = useSearchParams().get("linkAssetId");

  return (
    <WizardShell
      hideSteps
      currentStep={1}
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
            onSelect={() => router.push(withLinkAsset(type.href, linkAssetId))}
          />
        ))}
      </div>
    </WizardShell>
  );
}
