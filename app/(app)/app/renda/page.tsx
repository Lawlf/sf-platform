import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";

import { RendaListClient } from "./_components/renda-list.client";

export const metadata: Metadata = { title: "Renda" };

export default async function RendaPage() {
  await requireUser();

  return (
    <PageShell title="Renda" description="Salário, dividendos, freelances. Suas fontes de renda.">
      <Link
        href={"/app/renda/nova" as Route}
        className="focus-ring flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105"
      >
        Adicionar nova renda
      </Link>

      <Suspense fallback={<IncomeListsSkeleton />}>
        <RendaListClient />
      </Suspense>
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
