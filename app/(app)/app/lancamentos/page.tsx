import { Plus } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { buildCategoryLabeler } from "../_actions/_category-labels";
import { listCategoriesQuery } from "../_actions/category-queries";
import { HowItWorksSheet } from "../_components/how-it-works-sheet";
import { PageShell } from "../_components/page-shell";

import { fetchTransactionsForRange } from "./_actions/transactions-list-queries";
import { TransactionsView } from "./_components/transactions-view.client";

export const metadata: Metadata = { title: "Movimentações" };

const HISTORY_MONTHS = 12;

interface PageProps {
  searchParams: Promise<{
    date?: string;
    month?: string;
    category?: string;
    from?: string;
    to?: string;
  }>;
}

function isValidDay(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidMonth(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s);
}

function formatBrl(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const fmt = (Number(abs) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${negative ? "-" : ""}${fmt}`;
}

export default async function LancamentosPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const sp = await searchParams;

  const categoryParam = sp.category && sp.category.length > 0 ? sp.category : null;

  // Modo "categoria · todos os meses": consulta de uma categoria ao longo do
  // tempo (12 meses), agrupada por mês. Ferramenta de busca, não orçamento.
  if (categoryParam) {
    const nowMonth = MonthYear.fromDate(new Date());
    const toMonth = sp.to && isValidMonth(sp.to) ? MonthYear.fromIso(sp.to) : nowMonth;
    let fromMonth: MonthYear;
    if (sp.from && isValidMonth(sp.from)) {
      fromMonth = MonthYear.fromIso(sp.from);
    } else {
      fromMonth = toMonth;
      for (let i = 0; i < HISTORY_MONTHS - 1; i++) fromMonth = fromMonth.previous();
    }
    if (fromMonth.isAfter(toMonth)) fromMonth = toMonth;

    const [all, labeler, catalog] = await Promise.all([
      fetchTransactionsForRange({
        fromIso: fromMonth.firstDay().toISOString(),
        toIso: toMonth.lastDay().toISOString(),
      }),
      buildCategoryLabeler(user.id),
      listCategoriesQuery(),
    ]);
    const transactions = all.filter((t) => t.categoryKey === categoryParam);
    const netCents = transactions.reduce(
      (acc, t) =>
        t.excludedFromTotals ? acc : acc + (t.direction === "in" ? 1n : -1n) * BigInt(t.amountCents),
      0n,
    );

    return (
      <PageShell
        title="Movimentações"
        description="Uma categoria ao longo dos meses."
        backHref="/app/lancamentos"
      >
        <TransactionsView
          key={`c-${categoryParam}-${fromMonth.toIso()}-${toMonth.toIso()}`}
          transactions={transactions}
          catalog={catalog}
          monthIso={nowMonth.toIso()}
          monthLabel={nowMonth.format()}
          focusedDay={null}
          categoryHistory={{
            categoryKey: categoryParam,
            categoryLabel: labeler(categoryParam) ?? categoryParam,
            periodTotalFormatted: formatBrl(netCents),
            fromMonth: fromMonth.toIso(),
            toMonth: toMonth.toIso(),
            nowMonthIso: nowMonth.toIso(),
          }}
        />
      </PageShell>
    );
  }

  const dayParam = sp.date && isValidDay(sp.date) ? sp.date : null;
  const monthIso =
    sp.month && isValidMonth(sp.month) ? sp.month : MonthYear.fromDate(new Date()).toIso();

  const range = dayParam
    ? { fromIso: `${dayParam}T00:00:00.000Z`, toIso: `${dayParam}T23:59:59.999Z` }
    : {
        fromIso: MonthYear.fromIso(monthIso).firstDay().toISOString(),
        toIso: MonthYear.fromIso(monthIso).lastDay().toISOString(),
      };

  const [transactions, catalog] = await Promise.all([
    fetchTransactionsForRange(range),
    listCategoriesQuery(),
  ]);

  const monthLabel = MonthYear.fromIso(monthIso).format();

  return (
    <PageShell
      title="Movimentações"
      description="Suas entradas e saídas avulsas, dia a dia."
      backHref="/app/linha-do-tempo"
    >
      <div className="flex flex-col gap-2">
        <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-muted)]">
          A renda que você registra entra direto no seu saldo. Aqui ficam só os lançamentos e o
          extrato, então a soma desta lista não fecha com o saldo, e tá certo assim.
        </p>
        <HowItWorksSheet topic="movimentacoes-saldo" variant="plain" />
      </div>

      <Link
        href={"/app/lancar" as Route}
        className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105"
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden />
        Registrar entrada ou saída
      </Link>

      <TransactionsView
        key={`m-${monthIso}-d-${dayParam ?? ""}`}
        transactions={transactions}
        catalog={catalog}
        monthIso={monthIso}
        monthLabel={monthLabel}
        focusedDay={dayParam}
      />
    </PageShell>
  );
}
