import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { PageShell } from "../../../_components/page-shell";

import { ManagePurchasesForm } from "./_components/manage-purchases-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ComprasPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();
  const r = await getDebtDetail(
    { debts: new DrizzleDebtRepository(), payments: new DrizzleDebtPaymentRepository() },
    { userId: user.id, debtId: id },
  );
  if (isErr(r)) notFound();
  const { debt } = r.value;

  if (debt.kind !== "credit_card") {
    redirect(`/app/dividas/${debt.id}` as Route);
  }

  return (
    <PageShell
      title={`Compras parceladas — ${debt.label}`}
      description="Adicione, edite ou remova compras parceladas desse cartão."
      backHref={`/app/dividas/${debt.id}` as Route}
    >
      <ManagePurchasesForm
        debtId={debt.id}
        defaults={debt.installmentPurchases.map((p) => ({
          description: p.description,
          totalCents: p.total.toCents().toString(),
          installmentsTotal: p.installmentsTotal,
          installmentsRemaining: p.installmentsRemaining,
        }))}
      />
    </PageShell>
  );
}
