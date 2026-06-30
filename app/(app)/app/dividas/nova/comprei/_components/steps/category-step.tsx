"use client";

import { Car, GraduationCap, Package, Plane, Smartphone, Sofa } from "lucide-react";
import type { ReactNode } from "react";

import { KindCard } from "@/ui/kind-card";
import type { PurchaseCategory } from "../../_actions/create-purchase.action";

interface CategoryOption {
  id: PurchaseCategory;
  title: string;
  description: string;
  icon: ReactNode;
}

const CATEGORIES: readonly CategoryOption[] = [
  {
    id: "electronics",
    title: "Eletrônico",
    description: "Celular, TV, computador, fone.",
    icon: <Smartphone size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "furniture",
    title: "Móvel ou eletrodoméstico",
    description: "Sofá, geladeira, microondas.",
    icon: <Sofa size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "vehicle",
    title: "Veículo",
    description: "Carro, moto, bike.",
    icon: <Car size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "travel",
    title: "Viagem ou experiência",
    description: "Passagens, hotel, show.",
    icon: <Plane size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "education",
    title: "Curso ou educação",
    description: "Curso, faculdade, livro.",
    icon: <GraduationCap size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "other",
    title: "Outro",
    description: "Qualquer outra coisa.",
    icon: <Package size={20} strokeWidth={1.75} aria-hidden />,
  },
] as const;

export interface CategoryStepProps {
  onSelectCategory: (category: PurchaseCategory) => void;
}

export function CategoryStep({ onSelectCategory }: CategoryStepProps) {
  return (
    <div role="radiogroup" aria-label="Categoria da compra" className="flex flex-col gap-2">
      {CATEGORIES.map((c) => (
        <KindCard
          key={c.id}
          icon={c.icon}
          title={c.title}
          description={c.description}
          selected={false}
          onSelect={() => onSelectCategory(c.id)}
        />
      ))}
    </div>
  );
}
