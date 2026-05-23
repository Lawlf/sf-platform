import type { Metadata } from "next";
import type { Route } from "next";

import { PlanComparison } from "@/app/(public)/_components/plan-comparison";

import { PageShell } from "../../../_components/page-shell";

export const metadata: Metadata = { title: "Comparar planos" };

export default function ComparePlansPage() {
  return (
    <PageShell
      title="Comparar planos"
      description="Tudo que está dentro do Free e do Pro, lado a lado."
      backHref={"/app/configuracoes/planos" as Route}
    >
      <PlanComparison />
    </PageShell>
  );
}
