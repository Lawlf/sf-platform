import type { Metadata } from "next";
import type { Route } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { incomeCopy } from "../../_lib/copy/catalogs";
import { getActiveProfileType, getCopy } from "../../_lib/copy/get-copy";
import { IncomeForm } from "../_components/income-form";

export const metadata: Metadata = { title: "Nova renda" };

export default async function NovaRendaPage() {
  const user = await requireUser();
  const t = getCopy(incomeCopy, await getActiveProfileType());

  return (
    <PageShell
      title="Adicionar renda"
      description={t("new.subtitle")}
      backHref={"/app/renda" as Route}
    >
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
        <IncomeForm defaultCurrency={user.baseCurrency} />
      </section>
    </PageShell>
  );
}
