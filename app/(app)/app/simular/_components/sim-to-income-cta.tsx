"use client";

import { Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildIncomeSeedQuery, type IncomeSeed } from "../_lib/income-seed";

import { isPublicCalc, SimSignupCta } from "./sim-signup-cta";

export function SimToIncomeCta({ seed, label }: { seed: IncomeSeed; label?: string }) {
  const pathname = usePathname();
  if (isPublicCalc(pathname)) return <SimSignupCta label="Criar conta para registrar sua renda" />;
  const href = `/app/renda/nova?${buildIncomeSeedQuery(seed)}` as Route;
  return (
    <Link
      href={href}
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-brand-500)] px-4 py-3 text-sm font-semibold text-white"
    >
      <Wallet size={18} strokeWidth={2} aria-hidden />
      {label ?? "Usar como minha renda"}
    </Link>
  );
}
