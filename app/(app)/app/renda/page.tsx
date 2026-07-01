import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Calculator, Plus, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { WEEKS_PER_MONTH } from "@/domain/services/monthly-frequency";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchIncomes } from "../_actions/income-queries";
import { HowItWorksSheet } from "../_components/how-it-works-sheet";
import { PageShell } from "../_components/page-shell";
import { getServerQueryClient } from "../_lib/query-client.server";
import { queryKeys } from "../_lib/query-keys";

import { RendaHero } from "./_components/renda-hero";
import { RendaListClient } from "./_components/renda-list.client";

export const metadata: Metadata = { title: "Renda" };

export default async function RendaPage() {
  await requireUser();

  const incomes = await fetchIncomes();
  const activeIncomes = incomes.filter((i) => i.isActive);
  const monthlyTotalCents = activeIncomes.reduce((acc, i) => {
    const cents = BigInt(i.amount.cents);
    if (i.frequency === "monthly") return acc + cents;
    if (i.frequency === "weekly") return acc + BigInt(Math.round(Number(cents) * WEEKS_PER_MONTH));
    return acc;
  }, 0n);
  const monthlyTotalFormatted = (Number(monthlyTotalCents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const queryClient = getServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.incomes,
    queryFn: () => fetchIncomes(),
  });

  const now = new Date();
  const currentMonthIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <PageShell
      title="Renda"
      description="Salário, freela, aluguel, comissão. Suas fontes de renda."
      headerAction={
        <div className="flex items-center gap-2">
          <HowItWorksSheet
            topic="renda"
            variant="brand"
            actions={[
              {
                icon: <TrendingUp size={18} strokeWidth={2} aria-hidden />,
                label: "Ver como seu mês fecha com essa renda",
                href: `/app/linha-do-tempo?jumpTo=${currentMonthIso}` as Route,
              },
              {
                icon: <Calculator size={18} strokeWidth={2} aria-hidden />,
                label: "Simuladores de renda",
                href: "/app/simular?category=trabalho" as Route,
              },
            ]}
          />
          <Link
            href={"/app/renda/nova" as Route}
            className="focus-ring flex items-center gap-1.5 rounded-xl bg-[color:var(--color-brand-500)] px-3.5 py-2 text-[0.8125rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.3)] transition-colors hover:bg-[color:var(--color-brand-600)]"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            Nova
          </Link>
        </div>
      }
    >
      <RendaHero monthlyTotalFormatted={monthlyTotalFormatted} activeCount={activeIncomes.length} />

      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<IncomeListsSkeleton />}>
          <RendaListClient />
        </Suspense>
      </HydrationBoundary>
    </PageShell>
  );
}

function IncomeListsSkeleton() {
  return (
    <section className="flex flex-col gap-2">
      <Skeleton className="h-3 w-20 rounded-md" />
      <div className="grid gap-2 md:grid-cols-2">
        <Skeleton className="h-[76px] rounded-2xl" />
        <Skeleton className="h-[76px] rounded-2xl" />
      </div>
    </section>
  );
}
