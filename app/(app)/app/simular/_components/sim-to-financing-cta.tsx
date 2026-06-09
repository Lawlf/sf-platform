"use client";

import { Landmark } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildFinancingSeedQuery, type FinancingSeed } from "../_lib/financing-seed";

import { isPublicCalc, SimSignupCta } from "./sim-signup-cta";

export function SimToFinancingCta({ seed }: { seed: FinancingSeed }) {
  const pathname = usePathname();
  if (isPublicCalc(pathname)) return <SimSignupCta label="Criar conta para cadastrar a dívida" />;
  const href = `/app/dividas/nova/financiamento?${buildFinancingSeedQuery(seed)}` as Route;
  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-brand-500)] px-4 py-3 text-sm font-semibold text-white"
    >
      <Landmark size={18} strokeWidth={2} aria-hidden />
      Cadastrar como dívida
    </Link>
  );
}
