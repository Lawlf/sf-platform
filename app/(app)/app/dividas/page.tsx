import { PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";

import type { DebtStatusFilter } from "../_actions/debt-queries";
import { PageShell } from "../_components/page-shell";

import { DividasFilterPills } from "./_components/dividas-filter-pills";
import { DividasListClient } from "./_components/dividas-list.client";

export const metadata: Metadata = { title: "Dívidas" };

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DividasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const statusFilter: DebtStatusFilter =
    sp.status === "all" || sp.status === "paid_off" || sp.status === "written_off"
      ? sp.status
      : "active";

  return (
    <PageShell title="Dívidas" description="Acompanhe e simule a quitação das suas dívidas.">
      <Link
        href={"/app/dividas/nova" as Route}
        className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105"
      >
        <PlusCircle size={16} strokeWidth={2} aria-hidden />
        Adicionar compra, conta ou dívida
      </Link>

      <DividasFilterPills />

      <Suspense key={statusFilter} fallback={<DividasListSkeleton />}>
        <DividasListClient statusFilter={statusFilter} />
      </Suspense>
    </PageShell>
  );
}

function DividasListSkeleton() {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[76px] rounded-2xl" />
      ))}
    </div>
  );
}
