import type { Metadata } from "next";
import type { Route } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";
import { lancarCopy } from "../_lib/copy/catalogs";
import { getActiveProfileType, getCopy } from "../_lib/copy/get-copy";
import { LogTransactionForm } from "../linha-do-tempo/_components/log-transaction-form.client";

export const metadata: Metadata = { title: "Registrar gasto" };

export default async function LancarPage() {
  await requireUser();
  const t = getCopy(lancarCopy, await getActiveProfileType());

  return (
    <PageShell
      title="Registrar gasto"
      description={t("page.subtitle")}
      backHref={"/app" as Route}
    >
      <LogTransactionForm />
    </PageShell>
  );
}
