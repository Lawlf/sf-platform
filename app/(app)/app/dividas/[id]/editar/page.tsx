import type { Route } from "next";
import { notFound } from "next/navigation";

import { listCategories } from "@/application/use-cases/category/list-categories.use-case";
import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { normalizeLegacyExpenseCategory } from "@/domain/categories/default-categories";
import { activeCategories } from "@/domain/categories/resolve-categories";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { PageShell } from "../../../_components/page-shell";

import { EditDebtForm } from "./_components/edit-debt-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarDividaPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();
  const r = await getDebtDetail(
    { debts: repos.debts, payments: repos.debtPayments },
    { userId: user.id, debtId: id },
  );
  if (isErr(r)) notFound();
  const { debt } = r.value;

  const categorySets = await listCategories(
    { userCategories: repos.userCategories },
    { userId: user.id },
  );
  const categories = activeCategories(categorySets.expense).map((c) => ({
    key: c.key,
    label: c.label,
  }));

  const annualRatePct = (() => {
    if (debt.kind === "financing" || debt.kind === "personal_loan") {
      return debt.annualInterestRate.toAnnual().toPercent();
    }
    return null;
  })();

  return (
    <PageShell
      title={`Editar ${debt.label}`}
      description="Corrija dados desse compromisso."
      backHref={`/app/dividas/${debt.id}` as Route}
    >
      <EditDebtForm
        debtId={debt.id}
        kind={debt.kind}
        currency={debt.currentBalance.currency}
        categories={categories}
        defaults={{
          label: debt.label,
          notes: debt.notes,
          expectedEndDate: debt.expectedEndDate
            ? debt.expectedEndDate.toISOString().slice(0, 10)
            : null,
          currentBalanceCents:
            debt.kind === "recurring" ? null : debt.currentBalance.toCents().toString(),
          annualRatePct,
          monthlyInstallmentCents:
            debt.kind === "personal_loan" ? debt.monthlyInstallment.toCents().toString() : null,
          monthlyInsuranceCents:
            debt.kind === "financing" && debt.monthlyInsurance
              ? debt.monthlyInsurance.toCents().toString()
              : null,
          monthlyAdminFeeCents:
            debt.kind === "financing" && debt.monthlyAdminFee
              ? debt.monthlyAdminFee.toCents().toString()
              : null,
          creditLimitCents:
            debt.kind === "credit_card" && debt.creditLimit
              ? debt.creditLimit.toCents().toString()
              : null,
          currentStatementCents:
            debt.kind === "credit_card" ? debt.currentStatement.toCents().toString() : null,
          statementDay: debt.kind === "credit_card" ? debt.statementDay : null,
          dueDay:
            debt.kind === "credit_card"
              ? debt.dueDay
              : debt.kind === "recurring"
                ? debt.dueDay
                : null,
          revolvingBalanceCents:
            debt.kind === "credit_card" && debt.revolvingBalance
              ? debt.revolvingBalance.toCents().toString()
              : null,
          revolvingMonthlyRatePct:
            debt.kind === "credit_card" && debt.revolvingMonthlyRate
              ? debt.revolvingMonthlyRate.toMonthly().toPercent()
              : null,
          bankName: debt.kind === "overdraft" ? debt.bankName : null,
          monthlyRatePct:
            debt.kind === "overdraft" ? debt.monthlyRate.toMonthly().toPercent() : null,
          recurringAmountCents:
            debt.kind === "recurring" ? debt.recurringAmountCents.toString() : null,
          recurringFrequency:
            debt.kind === "recurring" && debt.recurringFrequency !== "annual"
              ? debt.recurringFrequency
              : null,
          expenseCategory:
            debt.kind === "recurring"
              ? normalizeLegacyExpenseCategory(debt.expenseCategory)
              : null,
        }}
      />
    </PageShell>
  );
}
